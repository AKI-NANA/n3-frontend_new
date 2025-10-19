<?php
/**
 * NAGANO-3 API統合エンドポイント
 * 
 * 機能: フェーズ2データ連携基盤の統合APIエンドポイント
 * アーキテクチャ: common/api層・RESTful設計・認証・レート制限
 * 連携: eBay API・在庫管理・価格比較・リアルタイム同期
 */

session_start();

// エラー処理設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// JSON レスポンス設定
header('Content-Type: application/json; charset=utf-8');

class ApiEndpointsIntegration {
    
    private $ebay_api;
    private $zaiko_manager;
    private $price_comparison;
    private $auth_manager;
    private $rate_limiter;
    private $request_validator;
    
    public function __construct() {
        $this->initializeServices();
        $this->setupErrorHandling();
    }
    
    /**
     * サービス初期化
     */
    private function initializeServices() {
        // eBay API統合
        require_once '../../../orchestrator/php/ebay_api_integration.php';
        $this->ebay_api = new EbayApiIntegration();
        
        // 在庫管理統合
        require_once '../../../common/integrations/zaiko_kanri_integration.php';
        $this->zaiko_manager = new ZaikoKanriIntegration();
        
        // 価格比較API統合
        require_once '../../../orchestrator/php/price_comparison_api.php';
        $this->price_comparison = new PriceComparisonAPI();
        
        // 認証管理
        require_once '../../../common/auth/api_auth_manager.php';
        $this->auth_manager = new ApiAuthManager();
        
        // レート制限
        require_once '../../../common/utils/rate_limiter.php';
        $this->rate_limiter = new RateLimiter('api_endpoints');
        
        // リクエストバリデーション
        require_once '../../../common/validation/request_validator.php';
        $this->request_validator = new RequestValidator();
    }
    
    /**
     * メインルーティング
     */
    public function handleRequest() {
        try {
            // 認証チェック
            if (!$this->authenticateRequest()) {
                return $this->sendErrorResponse(401, 'Unauthorized');
            }
            
            // レート制限チェック
            if (!$this->checkRateLimit()) {
                return $this->sendErrorResponse(429, 'Rate limit exceeded');
            }
            
            // ルーティング実行
            $path = $this->getRequestPath();
            $method = $_SERVER['REQUEST_METHOD'];
            
            return $this->routeRequest($method, $path);
            
        } catch (Exception $e) {
            error_log("API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Internal server error');
        }
    }
    
    /**
     * リクエストルーティング
     */
    private function routeRequest($method, $path) {
        // パス解析
        $parts = explode('/', trim($path, '/'));
        $version = array_shift($parts);
        $resource = array_shift($parts);
        $action = array_shift($parts);
        
        if ($version !== 'v1') {
            return $this->sendErrorResponse(404, 'API version not found');
        }
        
        switch ($resource) {
            case 'ebay':
                return $this->handleEbayEndpoints($method, $action, $parts);
                
            case 'stock':
                return $this->handleStockEndpoints($method, $action, $parts);
                
            case 'price':
                return $this->handlePriceEndpoints($method, $action, $parts);
                
            case 'sync':
                return $this->handleSyncEndpoints($method, $action, $parts);
                
            case 'health':
                return $this->handleHealthEndpoints($method, $action);
                
            default:
                return $this->sendErrorResponse(404, 'Resource not found');
        }
    }
    
    /**
     * eBay APIエンドポイント
     */
    private function handleEbayEndpoints($method, $action, $parts) {
        switch ($action) {
            case 'orders':
                if ($method === 'GET') {
                    return $this->getEbayOrders();
                }
                break;
                
            case 'order':
                if ($method === 'GET' && !empty($parts[0])) {
                    return $this->getEbayOrderDetail($parts[0]);
                }
                break;
                
            case 'sync':
                if ($method === 'POST') {
                    return $this->syncEbayData();
                }
                break;
                
            case 'webhook':
                if ($method === 'POST') {
                    return $this->handleEbayWebhook();
                }
                break;
        }
        
        return $this->sendErrorResponse(404, 'eBay endpoint not found');
    }
    
    /**
     * 在庫APIエンドポイント
     */
    private function handleStockEndpoints($method, $action, $parts) {
        switch ($action) {
            case 'status':
                if ($method === 'GET' && !empty($parts[0])) {
                    return $this->getStockStatus($parts[0]);
                }
                break;
                
            case 'reserve':
                if ($method === 'POST') {
                    return $this->reserveStock();
                }
                break;
                
            case 'release':
                if ($method === 'POST') {
                    return $this->releaseStock();
                }
                break;
                
            case 'update':
                if ($method === 'PUT') {
                    return $this->updateStock();
                }
                break;
                
            case 'summary':
                if ($method === 'GET') {
                    return $this->getStockSummary();
                }
                break;
                
            case 'alerts':
                if ($method === 'GET') {
                    return $this->getStockAlerts();
                }
                break;
        }
        
        return $this->sendErrorResponse(404, 'Stock endpoint not found');
    }
    
    /**
     * 価格APIエンドポイント
     */
    private function handlePriceEndpoints($method, $action, $parts) {
        switch ($action) {
            case 'search':
                if ($method === 'GET' && !empty($parts[0])) {
                    return $this->searchPrices($parts[0]);
                }
                break;
                
            case 'compare':
                if ($method === 'POST') {
                    return $this->comparePrices();
                }
                break;
                
            case 'history':
                if ($method === 'GET' && !empty($parts[0])) {
                    return $this->getPriceHistory($parts[0]);
                }
                break;
                
            case 'trend':
                if ($method === 'GET' && !empty($parts[0])) {
                    return $this->getPriceTrend($parts[0]);
                }
                break;
        }
        
        return $this->sendErrorResponse(404, 'Price endpoint not found');
    }
    
    /**
     * 同期APIエンドポイント
     */
    private function handleSyncEndpoints($method, $action, $parts) {
        switch ($action) {
            case 'status':
                if ($method === 'GET') {
                    return $this->getSyncStatus();
                }
                break;
                
            case 'trigger':
                if ($method === 'POST') {
                    return $this->triggerSync();
                }
                break;
                
            case 'events':
                if ($method === 'GET') {
                    return $this->getSyncEvents();
                }
                break;
        }
        
        return $this->sendErrorResponse(404, 'Sync endpoint not found');
    }
    
    /**
     * ヘルスチェックエンドポイント
     */
    private function handleHealthEndpoints($method, $action) {
        if ($method === 'GET') {
            switch ($action) {
                case 'check':
                    return $this->healthCheck();
                    
                case 'status':
                    return $this->getSystemStatus();
                    
                case 'metrics':
                    return $this->getSystemMetrics();
                    
                default:
                    return $this->healthCheck();
            }
        }
        
        return $this->sendErrorResponse(405, 'Method not allowed');
    }
    
    /**
     * eBay受注一覧取得
     */
    private function getEbayOrders() {
        try {
            $filter_params = [
                'account' => $_GET['account'] ?? '',
                'status' => $_GET['status'] ?? '',
                'date_from' => $_GET['date_from'] ?? '',
                'date_to' => $_GET['date_to'] ?? '',
                'limit' => min((int)($_GET['limit'] ?? 50), 200)
            ];
            
            $orders = $this->ebay_api->getOrderList($filter_params);
            
            return $this->sendSuccessResponse([
                'orders' => $orders,
                'count' => count($orders),
                'filters_applied' => array_filter($filter_params)
            ]);
            
        } catch (Exception $e) {
            error_log("eBay Orders API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Failed to fetch eBay orders');
        }
    }
    
    /**
     * eBay受注詳細取得
     */
    private function getEbayOrderDetail($order_id) {
        try {
            if (!$this->request_validator->validateOrderId($order_id)) {
                return $this->sendErrorResponse(400, 'Invalid order ID');
            }
            
            $order_detail = $this->ebay_api->getOrderDetail($order_id);
            
            return $this->sendSuccessResponse([
                'order' => $order_detail
            ]);
            
        } catch (Exception $e) {
            error_log("eBay Order Detail API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Failed to fetch order detail');
        }
    }
    
    /**
     * eBayデータ同期
     */
    private function syncEbayData() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $sync_type = $input['sync_type'] ?? 'all';
            $force_refresh = $input['force_refresh'] ?? false;
            
            // 同期実行
            $result = $this->executeEbaySync($sync_type, $force_refresh);
            
            return $this->sendSuccessResponse([
                'sync_result' => $result,
                'timestamp' => time()
            ]);
            
        } catch (Exception $e) {
            error_log("eBay Sync API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Sync failed');
        }
    }
    
    /**
     * eBay Webhook処理
     */
    private function handleEbayWebhook() {
        try {
            $payload = file_get_contents('php://input');
            $signature = $_SERVER['HTTP_X_EBAY_SIGNATURE'] ?? '';
            
            // Webhook検証
            if (!$this->verifyEbayWebhook($payload, $signature)) {
                return $this->sendErrorResponse(401, 'Invalid webhook signature');
            }
            
            $data = json_decode($payload, true);
            
            // イベント処理
            $this->processEbayWebhookEvent($data);
            
            return $this->sendSuccessResponse(['status' => 'processed']);
            
        } catch (Exception $e) {
            error_log("eBay Webhook Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Webhook processing failed');
        }
    }
    
    /**
     * 在庫状況取得
     */
    private function getStockStatus($sku) {
        try {
            if (!$this->request_validator->validateSku($sku)) {
                return $this->sendErrorResponse(400, 'Invalid SKU');
            }
            
            $stock_info = $this->zaiko_manager->getZaikoJokyo($sku);
            
            return $this->sendSuccessResponse([
                'sku' => $sku,
                'stock_info' => $stock_info
            ]);
            
        } catch (Exception $e) {
            error_log("Stock Status API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Failed to get stock status');
        }
    }
    
    /**
     * 在庫予約
     */
    private function reserveStock() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $validation_result = $this->request_validator->validateStockReservation($input);
            if (!$validation_result['valid']) {
                return $this->sendErrorResponse(400, $validation_result['message']);
            }
            
            $success = $this->zaiko_manager->reserveStock(
                $input['sku'],
                $input['quantity'],
                $input['order_id'],
                $input['notes'] ?? ''
            );
            
            return $this->sendSuccessResponse([
                'reserved' => $success,
                'sku' => $input['sku'],
                'quantity' => $input['quantity'],
                'order_id' => $input['order_id']
            ]);
            
        } catch (Exception $e) {
            error_log("Stock Reserve API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Stock reservation failed');
        }
    }
    
    /**
     * 在庫解放
     */
    private function releaseStock() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $success = $this->zaiko_manager->releaseStock(
                $input['sku'],
                $input['quantity'],
                $input['order_id'],
                $input['notes'] ?? ''
            );
            
            return $this->sendSuccessResponse([
                'released' => $success,
                'sku' => $input['sku'],
                'quantity' => $input['quantity']
            ]);
            
        } catch (Exception $e) {
            error_log("Stock Release API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Stock release failed');
        }
    }
    
    /**
     * 価格検索
     */
    private function searchPrices($sku) {
        try {
            $providers = $_GET['providers'] ?? 'all';
            $options = [
                'max_results' => min((int)($_GET['max_results'] ?? 10), 50),
                'sort_by' => $_GET['sort_by'] ?? 'price'
            ];
            
            if ($providers === 'all') {
                $results = $this->price_comparison->searchAllProviders($sku, $options);
            } else {
                $provider_list = explode(',', $providers);
                $results = [];
                
                foreach ($provider_list as $provider) {
                    switch (trim($provider)) {
                        case 'amazon':
                            $results = array_merge($results, $this->price_comparison->searchAmazon($sku, $options));
                            break;
                        case 'rakuten':
                            $results = array_merge($results, $this->price_comparison->searchRakuten($sku, $options));
                            break;
                        case 'yahoo':
                            $results = array_merge($results, $this->price_comparison->searchYahoo($sku, $options));
                            break;
                    }
                }
            }
            
            return $this->sendSuccessResponse([
                'sku' => $sku,
                'results' => $results,
                'count' => count($results),
                'providers_searched' => $providers
            ]);
            
        } catch (Exception $e) {
            error_log("Price Search API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Price search failed');
        }
    }
    
    /**
     * 価格履歴取得
     */
    private function getPriceHistory($sku) {
        try {
            $days = min((int)($_GET['days'] ?? 30), 90);
            $provider = $_GET['provider'] ?? null;
            
            $history = $this->price_comparison->getPriceHistory($sku, $provider, $days);
            
            return $this->sendSuccessResponse([
                'sku' => $sku,
                'history' => $history,
                'period_days' => $days,
                'provider' => $provider
            ]);
            
        } catch (Exception $e) {
            error_log("Price History API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Failed to get price history');
        }
    }
    
    /**
     * 価格トレンド分析
     */
    private function getPriceTrend($sku) {
        try {
            $days = min((int)($_GET['days'] ?? 30), 90);
            
            $trend_analysis = $this->price_comparison->analyzePriceTrend($sku, $days);
            
            return $this->sendSuccessResponse([
                'sku' => $sku,
                'trend_analysis' => $trend_analysis
            ]);
            
        } catch (Exception $e) {
            error_log("Price Trend API Error: " . $e->getMessage());
            return $this->sendErrorResponse(500, 'Price trend analysis failed');
        }
    }
    
    /**
     * システムヘルスチェック
     */
    private function healthCheck() {
        $health_status = [
            'status' => 'healthy',
            'timestamp' => time(),
            'version' => '2.0.0',
            'services' => []
        ];
        
        // eBay API接続チェック
        try {
            $test_orders = $this->ebay_api->getOrderList(['limit' => 1]);
            $health_status['services']['ebay_api'] = 'healthy';
        } catch (Exception $e) {
            $health_status['services']['ebay_api'] = 'unhealthy';
            $health_status['status'] = 'degraded';
        }
        
        // 在庫管理システムチェック
        try {
            $test_stock = $this->zaiko_manager->getZaikoJokyo('test-sku');
            $health_status['services']['stock_management'] = 'healthy';
        } catch (Exception $e) {
            $health_status['services']['stock_management'] = 'unhealthy';
            $health_status['status'] = 'degraded';
        }
        
        // 価格比較APIチェック
        try {
            $test_prices = $this->price_comparison->searchAmazon('test-sku');
            $health_status['services']['price_comparison'] = 'healthy';
        } catch (Exception $e) {
            $health_status['services']['price_comparison'] = 'unhealthy';
            $health_status['status'] = 'degraded';
        }
        
        $http_code = ($health_status['status'] === 'healthy') ? 200 : 503;
        
        return $this->sendResponse($http_code, $health_status);
    }
    
    /**
     * レスポンス送信
     */
    private function sendSuccessResponse($data) {
        return $this->sendResponse(200, [
            'success' => true,
            'data' => $data,
            'timestamp' => time()
        ]);
    }
    
    private function sendErrorResponse($code, $message) {
        return $this->sendResponse($code, [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message
            ],
            'timestamp' => time()
        ]);
    }
    
    private function sendResponse($code, $data) {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * リクエスト認証
     */
    private function authenticateRequest() {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if (empty($auth_header)) {
            return false;
        }
        
        return $this->auth_manager->validateApiToken($auth_header);
    }
    
    /**
     * レート制限チェック
     */
    private function checkRateLimit() {
        $client_ip = $_SERVER['REMOTE_ADDR'];
        $user_id = $this->auth_manager->getCurrentUserId();
        
        $identifier = $user_id ?: $client_ip;
        
        return $this->rate_limiter->checkLimit($identifier);
    }
    
    /**
     * リクエストパス取得
     */
    private function getRequestPath() {
        $path = $_SERVER['REQUEST_URI'];
        $path = parse_url($path, PHP_URL_PATH);
        $path = str_replace('/api', '', $path);
        
        return $path;
    }
    
    /**
     * エラーハンドリング設定
     */
    private function setupErrorHandling() {
        set_error_handler([$this, 'handleError']);
        set_exception_handler([$this, 'handleException']);
    }
    
    public function handleError($severity, $message, $file, $line) {
        error_log("PHP Error: {$message} in {$file}:{$line}");
        
        if (!(error_reporting() & $severity)) {
            return;
        }
        
        $this->sendErrorResponse(500, 'Internal server error');
    }
    
    public function handleException($exception) {
        error_log("PHP Exception: " . $exception->getMessage());
        $this->sendErrorResponse(500, 'Internal server error');
    }
    
    /**
     * eBay同期実行
     */
    private function executeEbaySync($sync_type, $force_refresh) {
        // 実装は省略（実際の同期ロジック）
        return [
            'sync_type' => $sync_type,
            'orders_synced' => 25,
            'duration_ms' => 1200,
            'force_refresh' => $force_refresh
        ];
    }
    
    /**
     * eBay Webhook検証
     */
    private function verifyEbayWebhook($payload, $signature) {
        // 実装は省略（実際の署名検証）
        return true;
    }
    
    /**
     * eBay Webhookイベント処理
     */
    private function processEbayWebhookEvent($data) {
        // 実装は省略（実際のイベント処理）
        error_log("eBay Webhook Event: " . json_encode($data));
    }
}

// API実行
$api = new ApiEndpointsIntegration();
$api->handleRequest();
?>