<?php
/**
 * APIキー管理PHPコントローラー
 * NAGANO-3統合対応版
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

require_once __DIR__ . '/../../../system_core/php/auth_manager.php';
require_once __DIR__ . '/../../../common/php/api_bridge_client.php';
require_once __DIR__ . '/../../../common/php/response_handler.php';
require_once __DIR__ . '/../../../common/php/validation_helper.php';

class ApiKeyController {
    
    private $auth_manager;
    private $api_client;
    private $response_handler;
    private $validator;
    private $user_id;
    private $current_user;
    
    public function __construct() {
        $this->auth_manager = new AuthManager();
        $this->api_client = new ApiBridgeClient('keys');
        $this->response_handler = new ResponseHandler();
        $this->validator = new ValidationHelper();
        
        // 認証確認
        if (!$this->auth_manager->is_authenticated()) {
            $this->redirect_to_login();
        }
        
        $this->current_user = $this->auth_manager->get_current_user();
        $this->user_id = $this->current_user['user_id'];
    }
    
    /**
     * メインページ表示
     */
    public function index() {
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.read')) {
                $this->handle_permission_error();
                return;
            }
            
            // ページパラメータ取得
            $page = $this->get_int_param('page', 1);
            $page_size = $this->get_int_param('page_size', 10);
            $filters = $this->build_filters($_GET);
            
            // API呼び出し
            $keys_response = $this->api_client->call_endpoint('/', 'GET', array_merge([
                'page' => $page,
                'page_size' => $page_size
            ], $filters));
            
            $stats_response = $this->api_client->call_endpoint('/stats/overview', 'GET');
            
            // データ準備
            $view_data = [
                'page_title' => 'APIキー管理',
                'current_page' => 'apikey',
                'keys_data' => $keys_response['success'] ? $keys_response['data'] : [],
                'stats' => $stats_response['success'] ? $stats_response['data'] : [],
                'pagination' => $this->build_pagination($keys_response['data'] ?? [], $page, $page_size),
                'filters' => $filters,
                'current_user' => $this->current_user,
                'permissions' => $this->get_user_permissions(),
                'flash_messages' => $this->get_flash_messages()
            ];
            
            // テンプレート表示
            $this->render_template('keys', $view_data);
            
        } catch (Exception $e) {
            $this->handle_error('APIキー一覧取得中にエラーが発生しました', $e);
        }
    }
    
    /**
     * APIキー作成
     */
    public function create() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            return $this->handle_create_post();
        }
        
        // 権限チェック
        if (!$this->auth_manager->check_permission('keys.create')) {
            $this->handle_permission_error();
            return;
        }
        
        // 作成フォーム表示
        $view_data = [
            'page_title' => 'APIキー作成',
            'services' => $this->get_api_services(),
            'tiers' => $this->get_api_tiers(),
            'current_user' => $this->current_user
        ];
        
        $this->render_template('key_create_modal', $view_data);
    }
    
    /**
     * APIキー作成処理
     */
    private function handle_create_post() {
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.create')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // CSRF トークン確認
            if (!$this->validate_csrf_token($_POST['csrf_token'] ?? '')) {
                return $this->json_response(['success' => false, 'message' => 'CSRFトークンが無効です']);
            }
            
            // バリデーション
            $validation_result = $this->validate_create_data($_POST);
            if (!$validation_result['valid']) {
                return $this->json_response([
                    'success' => false, 
                    'message' => '入力値に問題があります',
                    'errors' => $validation_result['errors']
                ]);
            }
            
            // APIキー作成データ準備
            $create_data = $this->prepare_create_data($_POST);
            
            // API呼び出し
            $response = $this->api_client->call_endpoint('/', 'POST', $create_data);
            
            if ($response['success']) {
                $this->set_flash_message('success', 'APIキーが正常に作成されました');
                return $this->json_response([
                    'success' => true,
                    'message' => 'APIキーが作成されました',
                    'data' => $response['data'],
                    'redirect' => '/keys'
                ]);
            } else {
                return $this->json_response([
                    'success' => false,
                    'message' => $response['message'] ?? 'APIキー作成に失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            error_log("APIキー作成エラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => 'システムエラーが発生しました'
            ]);
        }
    }
    
    /**
     * APIキー更新
     */
    public function update($key_id) {
        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            return $this->handle_update_put($key_id);
        }
        
        // 権限チェック
        if (!$this->auth_manager->check_permission('keys.update')) {
            $this->handle_permission_error();
            return;
        }
        
        // 現在のキー情報取得
        $key_response = $this->api_client->call_endpoint("/{$key_id}", 'GET');
        
        if (!$key_response['success']) {
            $this->handle_not_found('APIキーが見つかりません');
            return;
        }
        
        $view_data = [
            'page_title' => 'APIキー編集',
            'key_data' => $key_response['data'],
            'services' => $this->get_api_services(),
            'tiers' => $this->get_api_tiers(),
            'statuses' => $this->get_api_statuses(),
            'current_user' => $this->current_user
        ];
        
        $this->render_template('key_edit_modal', $view_data);
    }
    
    /**
     * APIキー更新処理
     */
    private function handle_update_put($key_id) {
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.update')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // リクエストボディ取得
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->json_response(['success' => false, 'message' => '無効なJSONデータです']);
            }
            
            // CSRF トークン確認
            if (!$this->validate_csrf_token($data['csrf_token'] ?? '')) {
                return $this->json_response(['success' => false, 'message' => 'CSRFトークンが無効です']);
            }
            
            // バリデーション
            $validation_result = $this->validate_update_data($data);
            if (!$validation_result['valid']) {
                return $this->json_response([
                    'success' => false,
                    'message' => '入力値に問題があります',
                    'errors' => $validation_result['errors']
                ]);
            }
            
            // 更新データ準備
            $update_data = $this->prepare_update_data($data);
            
            // API呼び出し
            $response = $this->api_client->call_endpoint("/{$key_id}", 'PUT', $update_data);
            
            if ($response['success']) {
                return $this->json_response([
                    'success' => true,
                    'message' => 'APIキーが更新されました',
                    'data' => $response['data']
                ]);
            } else {
                return $this->json_response([
                    'success' => false,
                    'message' => $response['message'] ?? 'APIキー更新に失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            error_log("APIキー更新エラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => 'システムエラーが発生しました'
            ]);
        }
    }
    
    /**
     * APIキー削除
     */
    public function delete($key_id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            $this->method_not_allowed();
            return;
        }
        
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.delete')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // CSRF トークン確認
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (!$this->validate_csrf_token($data['csrf_token'] ?? '')) {
                return $this->json_response(['success' => false, 'message' => 'CSRFトークンが無効です']);
            }
            
            // API呼び出し
            $response = $this->api_client->call_endpoint("/{$key_id}", 'DELETE');
            
            if ($response['success']) {
                return $this->json_response([
                    'success' => true,
                    'message' => 'APIキーが削除されました'
                ]);
            } else {
                return $this->json_response([
                    'success' => false,
                    'message' => $response['message'] ?? 'APIキー削除に失敗しました'
                ]);
            }
            
        } catch (Exception $e) {
            error_log("APIキー削除エラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => 'システムエラーが発生しました'
            ]);
        }
    }
    
    /**
     * APIキーテスト
     */
    public function test($key_id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->method_not_allowed();
            return;
        }
        
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.test')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // リクエストデータ取得
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->json_response(['success' => false, 'message' => '無効なJSONデータです']);
            }
            
            // テストデータ準備
            $test_data = [
                'test_url' => $data['test_url'] ?? 'https://httpbin.org/status/200',
                'expected_status' => $data['expected_status'] ?? 200,
                'timeout' => $data['timeout'] ?? 30
            ];
            
            // API呼び出し
            $response = $this->api_client->call_endpoint("/{$key_id}/test", 'POST', $test_data);
            
            return $this->json_response($response);
            
        } catch (Exception $e) {
            error_log("APIキーテストエラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => 'テスト実行中にエラーが発生しました'
            ]);
        }
    }
    
    /**
     * 一括操作
     */
    public function bulk_operation() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->method_not_allowed();
            return;
        }
        
        try {
            // リクエストデータ取得
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $this->json_response(['success' => false, 'message' => '無効なJSONデータです']);
            }
            
            // 権限チェック
            $operation = $data['operation'] ?? '';
            if ($operation === 'delete' && !$this->auth_manager->check_permission('keys.delete')) {
                return $this->json_response(['success' => false, 'message' => '削除権限がありません']);
            } elseif (!$this->auth_manager->check_permission('keys.update')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // API呼び出し
            $response = $this->api_client->call_endpoint('/bulk-operations', 'POST', $data);
            
            return $this->json_response($response);
            
        } catch (Exception $e) {
            error_log("一括操作エラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => '一括操作中にエラーが発生しました'
            ]);
        }
    }
    
    /**
     * 統計情報取得
     */
    public function stats() {
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.stats')) {
                return $this->json_response(['success' => false, 'message' => '権限がありません']);
            }
            
            // API呼び出し
            $response = $this->api_client->call_endpoint('/stats/overview', 'GET');
            
            return $this->json_response($response);
            
        } catch (Exception $e) {
            error_log("統計取得エラー: " . $e->getMessage());
            return $this->json_response([
                'success' => false,
                'message' => '統計情報取得中にエラーが発生しました'
            ]);
        }
    }
    
    /**
     * エクスポート
     */
    public function export() {
        try {
            // 権限チェック
            if (!$this->auth_manager->check_permission('keys.read')) {
                $this->handle_permission_error();
                return;
            }
            
            $format = $_GET['format'] ?? 'json';
            $include_sensitive = isset($_GET['include_sensitive']) && $_GET['include_sensitive'] === 'true';
            
            $export_data = [
                'format' => $format,
                'include_sensitive' => $include_sensitive,
                'include_logs' => false
            ];
            
            // API呼び出し
            $response = $this->api_client->call_endpoint('/export', 'POST', $export_data);
            
            if ($response['success']) {
                $this->download_export($response['data'], $format);
            } else {
                $this->handle_error('エクスポートに失敗しました');
            }
            
        } catch (Exception $e) {
            $this->handle_error('エクスポート中にエラーが発生しました', $e);
        }
    }
    
    /**
     * バリデーション - 作成データ
     */
    private function validate_create_data($data) {
        $errors = [];
        
        // 必須フィールド
        if (empty($data['key_name'])) {
            $errors['key_name'] = 'キー名は必須です';
        }
        
        if (empty($data['api_service'])) {
            $errors['api_service'] = 'APIサービスは必須です';
        }
        
        if (empty($data['api_key'])) {
            $errors['api_key'] = 'APIキーは必須です';
        } elseif (strlen($data['api_key']) < 10) {
            $errors['api_key'] = 'APIキーは10文字以上である必要があります';
        }
        
        // 制限値チェック
        $limits = ['daily_limit', 'hourly_limit', 'minute_limit', 'concurrent_limit'];
        foreach ($limits as $limit) {
            if (!empty($data[$limit]) && (!is_numeric($data[$limit]) || $data[$limit] <= 0)) {
                $errors[$limit] = '制限値は正の整数である必要があります';
            }
        }
        
        // 有効期限チェック
        if (!empty($data['expires_at'])) {
            $expires_date = strtotime($data['expires_at']);
            if ($expires_date === false || $expires_date <= time()) {
                $errors['expires_at'] = '有効期限は現在時刻より後である必要があります';
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * バリデーション - 更新データ
     */
    private function validate_update_data($data) {
        $errors = [];
        
        // キー名チェック
        if (isset($data['key_name']) && empty(trim($data['key_name']))) {
            $errors['key_name'] = 'キー名は空にできません';
        }
        
        // 制限値チェック
        $limits = ['daily_limit', 'hourly_limit', 'minute_limit', 'concurrent_limit'];
        foreach ($limits as $limit) {
            if (isset($data[$limit]) && !empty($data[$limit])) {
                if (!is_numeric($data[$limit]) || $data[$limit] <= 0) {
                    $errors[$limit] = '制限値は正の整数である必要があります';
                }
            }
        }
        
        // 有効期限チェック
        if (isset($data['expires_at']) && !empty($data['expires_at'])) {
            $expires_date = strtotime($data['expires_at']);
            if ($expires_date === false || $expires_date <= time()) {
                $errors['expires_at'] = '有効期限は現在時刻より後である必要があります';
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
    
    /**
     * 作成データ準備
     */
    private function prepare_create_data($post_data) {
        $data = [
            'key_name' => trim($post_data['key_name']),
            'api_service' => $post_data['api_service'],
            'tier_level' => $post_data['tier_level'] ?? 'basic',
            'api_key' => trim($post_data['api_key']),
            'notes' => trim($post_data['notes'] ?? '')
        ];
        
        // オプショナルフィールド
        if (!empty($post_data['secret_key'])) {
            $data['secret_key'] = trim($post_data['secret_key']);
        }
        
        // 制限値
        $limits = ['daily_limit', 'hourly_limit', 'minute_limit', 'concurrent_limit'];
        foreach ($limits as $limit) {
            if (!empty($post_data[$limit]) && is_numeric($post_data[$limit])) {
                $data[$limit] = (int)$post_data[$limit];
            }
        }
        
        // 有効期限
        if (!empty($post_data['expires_at'])) {
            $data['expires_at'] = date('c', strtotime($post_data['expires_at']));
        }
        
        // 設定JSON
        if (!empty($post_data['configuration'])) {
            $config = json_decode($post_data['configuration'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $data['configuration'] = $config;
            }
        }
        
        return $data;
    }
    
    /**
     * 更新データ準備
     */
    private function prepare_update_data($data) {
        $update_data = [];
        
        // 更新可能フィールド
        $updatable_fields = [
            'key_name', 'tier_level', 'status', 'daily_limit', 
            'hourly_limit', 'minute_limit', 'concurrent_limit', 
            'expires_at', 'notes'
        ];
        
        foreach ($updatable_fields as $field) {
            if (isset($data[$field])) {
                if (in_array($field, ['daily_limit', 'hourly_limit', 'minute_limit', 'concurrent_limit'])) {
                    $update_data[$field] = !empty($data[$field]) ? (int)$data[$field] : null;
                } elseif ($field === 'expires_at') {
                    $update_data[$field] = !empty($data[$field]) ? date('c', strtotime($data[$field])) : null;
                } else {
                    $update_data[$field] = $data[$field];
                }
            }
        }
        
        // 設定JSON
        if (isset($data['configuration'])) {
            if (is_array($data['configuration'])) {
                $update_data['configuration'] = $data['configuration'];
            } else {
                $config = json_decode($data['configuration'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $update_data['configuration'] = $config;
                }
            }
        }
        
        return $update_data;
    }
    
    /**
     * フィルター構築
     */
    private function build_filters($get_params) {
        $filters = [];
        
        $filter_mappings = [
            'service' => 'service_filter',
            'tier' => 'tier_filter',
            'status' => 'status_filter',
            'search' => 'search',
            'is_primary' => 'is_primary',
            'is_expired' => 'is_expired'
        ];
        
        foreach ($filter_mappings as $param => $filter) {
            if (!empty($get_params[$param])) {
                if ($param === 'is_primary' || $param === 'is_expired') {
                    $filters[$filter] = filter_var($get_params[$param], FILTER_VALIDATE_BOOLEAN);
                } else {
                    $filters[$filter] = $get_params[$param];
                }
            }
        }
        
        return $filters;
    }
    
    /**
     * ページネーション情報構築
     */
    private function build_pagination($data, $page, $page_size) {
        $total = $data['total'] ?? 0;
        $total_pages = ceil($total / $page_size);
        
        return [
            'current_page' => $page,
            'page_size' => $page_size,
            'total' => $total,
            'total_pages' => $total_pages,
            'has_prev' => $page > 1,
            'has_next' => $page < $total_pages,
            'prev_page' => max(1, $page - 1),
            'next_page' => min($total_pages, $page + 1)
        ];
    }
    
    /**
     * 各種選択肢データ取得
     */
    private function get_api_services() {
        return [
            'amazon_pa_api' => 'Amazon PA-API',
            'amazon_sp_api' => 'Amazon SP-API',
            'ebay_api' => 'eBay API',
            'shopify_api' => 'Shopify API',
            'yahoo_auction_api' => 'Yahoo!オークション',
            'mercari_api' => 'メルカリAPI',
            'rakuten_api' => '楽天API'
        ];
    }
    
    private function get_api_tiers() {
        return [
            'premium' => 'PREMIUM',
            'standard' => 'STANDARD',
            'basic' => 'BASIC',
            'backup' => 'BACKUP'
        ];
    }
    
    private function get_api_statuses() {
        return [
            'active' => 'アクティブ',
            'inactive' => '非アクティブ',
            'suspended' => '停止中',
            'rate_limited' => 'レート制限中',
            'expired' => '期限切れ',
            'error' => 'エラー'
        ];
    }
    
    /**
     * ユーザー権限取得
     */
    private function get_user_permissions() {
        return [
            'can_create' => $this->auth_manager->check_permission('keys.create'),
            'can_read' => $this->auth_manager->check_permission('keys.read'),
            'can_update' => $this->auth_manager->check_permission('keys.update'),
            'can_delete' => $this->auth_manager->check_permission('keys.delete'),
            'can_test' => $this->auth_manager->check_permission('keys.test'),
            'can_stats' => $this->auth_manager->check_permission('keys.stats'),
            'is_admin' => $this->auth_manager->check_permission('system.admin')
        ];
    }
    
    /**
     * ヘルパーメソッド
     */
    private function get_int_param($key, $default = 0) {
        return isset($_GET[$key]) ? max(1, (int)$_GET[$key]) : $default;
    }
    
    private function validate_csrf_token($token) {
        return hash_equals($_SESSION['csrf_token'] ?? '', $token);
    }
    
    private function json_response($data) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    private function set_flash_message($type, $message) {
        $_SESSION['flash_messages'][] = ['type' => $type, 'message' => $message];
    }
    
    private function get_flash_messages() {
        $messages = $_SESSION['flash_messages'] ?? [];
        unset($_SESSION['flash_messages']);
        return $messages;
    }
    
    private function redirect_to_login() {
        header('Location: /login');
        exit;
    }
    
    private function handle_permission_error() {
        http_response_code(403);
        $this->render_error_page('権限エラー', 'このページにアクセスする権限がありません。');
    }
    
    private function handle_not_found($message = 'ページが見つかりません') {
        http_response_code(404);
        $this->render_error_page('404 Not Found', $message);
    }
    
    private function method_not_allowed() {
        http_response_code(405);
        $this->json_response(['success' => false, 'message' => 'メソッドが許可されていません']);
    }
    
    private function handle_error($message, $exception = null) {
        if ($exception) {
            error_log("APIキー管理エラー: " . $exception->getMessage());
        }
        
        http_response_code(500);
        $this->render_error_page('エラー', $message);
    }
    
    private function render_template($template, $data = []) {
        extract($data);
        include __DIR__ . "/../templates/{$template}.html";
    }
    
    private function render_error_page($title, $message) {
        $data = [
            'page_title' => $title,
            'error_message' => $message,
            'current_user' => $this->current_user
        ];
        $this->render_template('error', $data);
    }
    
    private function download_export($data, $format) {
        $filename = 'api_keys_export_' . date('Y-m-d_H-i-s');
        
        if ($format === 'json') {
            header('Content-Type: application/json');
            header("Content-Disposition: attachment; filename=\"{$filename}.json\"");
            echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } elseif ($format === 'csv') {
            header('Content-Type: text/csv');
            header("Content-Disposition: attachment; filename=\"{$filename}.csv\"");
            
            // CSV出力実装
            $output = fopen('php://output', 'w');
            
            // ヘッダー
            if (!empty($data['keys'])) {
                fputcsv($output, array_keys($data['keys'][0]));
                
                // データ
                foreach ($data['keys'] as $row) {
                    fputcsv($output, $row);
                }
            }
            
            fclose($output);
        }
        
        exit;
    }
}

// 自動実行（直接アクセス時）
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    $controller = new ApiKeyController();
    
    // ルーティング
    $path = $_SERVER['PATH_INFO'] ?? '/';
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($path === '/' && $method === 'GET') {
        $controller->index();
    } elseif ($path === '/create') {
        $controller->create();
    } elseif (preg_match('/\/(\d+)\/update/', $path, $matches)) {
        $controller->update($matches[1]);
    } elseif (preg_match('/\/(\d+)\/delete/', $path, $matches)) {
        $controller->delete($matches[1]);
    } elseif (preg_match('/\/(\d+)\/test/', $path, $matches)) {
        $controller->test($matches[1]);
    } elseif ($path === '/bulk-operation') {
        $controller->bulk_operation();
    } elseif ($path === '/stats') {
        $controller->stats();
    } elseif ($path === '/export') {
        $controller->export();
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'エンドポイントが見つかりません']);
    }
}
?>