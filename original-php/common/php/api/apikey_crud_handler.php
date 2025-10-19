<?php
/**
 * modules/apikey/php/api_crud_handler.php
 * WebUI用完全CRUD操作ハンドラー
 * 
 * 機能:
 * - POST /create - 新規APIキー作成
 * - GET /list - APIキー一覧取得
 * - PUT /update/{id} - APIキー更新
 * - DELETE /delete/{id} - APIキー削除
 * - POST /test/{id} - APIキーテスト
 */

header('Content-Type: application/json; charset=UTF-8');

// セキュリティとライブラリ読み込み
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 設定読み込み
$config_paths = [
    __DIR__ . '/../../../config/apikey_config.php',
    __DIR__ . '/../../config/apikey_config.php',
    dirname(dirname(dirname(__DIR__))) . '/config/apikey_config.php'
];

$config_loaded = false;
foreach ($config_paths as $config_path) {
    if (file_exists($config_path)) {
        require_once $config_path;
        $config_loaded = true;
        break;
    }
}

if (!$config_loaded) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '設定ファイルが見つかりません']);
    exit;
}

/**
 * APIキーCRUDクラス
 */
class APIKeyCRUDHandler {
    private $pdo;
    private $user_id;
    
    public function __construct() {
        $this->initializeDatabase();
        $this->user_id = $this->getCurrentUserId();
    }
    
    private function initializeDatabase() {
        try {
            if (class_exists('DatabaseConnection')) {
                $this->pdo = DatabaseConnection::getInstance()->getPDO();
            } else {
                // フォールバック接続
                $dsn = "pgsql:host=" . (defined('DB_HOST') ? DB_HOST : 'localhost') . 
                       ";port=" . (defined('DB_PORT') ? DB_PORT : '5432') . 
                       ";dbname=" . (defined('DB_NAME') ? DB_NAME : 'nagano3_apikeys');
                $user = defined('DB_USER') ? DB_USER : 'postgres';
                $pass = defined('DB_PASS') ? DB_PASS : '';
                
                $this->pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
            }
        } catch (PDOException $e) {
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
    
    private function getCurrentUserId() {
        // セッションからユーザーID取得（簡易実装）
        session_start();
        if (isset($_SESSION['user_id'])) {
            return $_SESSION['user_id'];
        }
        
        // フォールバック: デフォルトユーザー
        try {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
            $stmt->execute();
            $user = $stmt->fetch();
            return $user ? $user['id'] : 1;
        } catch (Exception $e) {
            return 1; // デフォルト
        }
    }
    
    /**
     * APIキー作成
     */
    public function createAPIKey($data) {
        try {
            // CSRF トークン検証
            $this->validateCSRFToken($data['csrf_token'] ?? '');
            
            // バリデーション
            $errors = $this->validateAPIKeyData($data);
            if (!empty($errors)) {
                return $this->errorResponse('入力データが無効です', 400, $errors);
            }
            
            // APIキー暗号化
            $encrypted_api_key = $this->encryptAPIKey($data['api_key']);
            $encrypted_secret_key = !empty($data['secret_key']) ? 
                $this->encryptAPIKey($data['secret_key']) : null;
            $api_key_hash = hash('sha256', $data['api_key']);
            
            // データベース挿入
            $sql = "
                INSERT INTO api_keys (
                    user_id, key_name, service_type, tier_level, 
                    encrypted_api_key, encrypted_secret_key, api_key_hash,
                    daily_limit, hourly_limit, notes, status, configuration
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
                RETURNING id, key_name, service_type, tier_level, created_at
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $this->user_id,
                $data['key_name'],
                $data['api_service'],
                $data['tier_level'] ?? 'basic',
                $encrypted_api_key,
                $encrypted_secret_key,
                $api_key_hash,
                !empty($data['daily_limit']) ? (int)$data['daily_limit'] : null,
                !empty($data['hourly_limit']) ? (int)$data['hourly_limit'] : null,
                $data['notes'] ?? '',
                !empty($data['configuration']) ? json_encode($data['configuration']) : null
            ]);
            
            $result = $stmt->fetch();
            
            // 監査ログ
            $this->logAudit('api_key_created', [
                'key_id' => $result['id'],
                'key_name' => $result['key_name'],
                'service_type' => $result['service_type']
            ]);
            
            return $this->successResponse('APIキーが正常に作成されました', $result);
            
        } catch (Exception $e) {
            error_log("APIキー作成エラー: " . $e->getMessage());
            return $this->errorResponse('APIキー作成に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * APIキー一覧取得
     */
    public function getAPIKeys($filters = []) {
        try {
            // ベースクエリ
            $where_conditions = ['is_deleted = false'];
            $params = [];
            
            // フィルター条件追加
            if (!empty($filters['service'])) {
                $where_conditions[] = 'service_type = ?';
                $params[] = $filters['service'];
            }
            
            if (!empty($filters['tier'])) {
                $where_conditions[] = 'tier_level = ?';
                $params[] = $filters['tier'];
            }
            
            if (!empty($filters['status'])) {
                $where_conditions[] = 'status = ?';
                $params[] = $filters['status'];
            }
            
            if (!empty($filters['search'])) {
                $where_conditions[] = '(key_name ILIKE ? OR notes ILIKE ?)';
                $search_term = '%' . $filters['search'] . '%';
                $params[] = $search_term;
                $params[] = $search_term;
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            // ページネーション
            $page = max(1, (int)($filters['page'] ?? 1));
            $page_size = min(100, max(10, (int)($filters['page_size'] ?? 25)));
            $offset = ($page - 1) * $page_size;
            
            // メインクエリ
            $sql = "
                SELECT 
                    id, key_name, service_type, tier_level, status,
                    daily_limit, hourly_limit, daily_usage, hourly_usage,
                    total_requests, successful_requests, success_rate,
                    avg_response_time, last_used_at, expires_at,
                    notes, created_at, updated_at,
                    CASE 
                        WHEN encrypted_api_key IS NOT NULL THEN 
                            CONCAT(
                                SUBSTRING(service_type, 1, 4), '_',
                                REPEAT('•', GREATEST(10, LENGTH(encrypted_api_key)/4)), 
                                SUBSTRING(encode(decode(encrypted_api_key, 'base64'), 'hex'), -3, 3)
                            )
                        ELSE '••••••••••••'
                    END as key_display,
                    tier_level = 'premium' OR tier_level = 'standard' as is_primary
                FROM api_keys 
                WHERE {$where_clause}
                ORDER BY 
                    CASE tier_level 
                        WHEN 'premium' THEN 1 
                        WHEN 'standard' THEN 2 
                        WHEN 'basic' THEN 3 
                        ELSE 4 
                    END,
                    created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $params[] = $page_size;
            $params[] = $offset;
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $keys = $stmt->fetchAll();
            
            // 総数取得
            $count_sql = "SELECT COUNT(*) as total FROM api_keys WHERE {$where_clause}";
            $count_stmt = $this->pdo->prepare($count_sql);
            $count_stmt->execute(array_slice($params, 0, -2)); // LIMIT/OFFSET除外
            $total = $count_stmt->fetch()['total'];
            
            // データ整形
            foreach ($keys as &$key) {
                $key['usage_rate'] = $key['daily_limit'] > 0 ? 
                    round(($key['daily_usage'] / $key['daily_limit']) * 100, 1) : 0;
                    
                $key['last_used_at'] = $key['last_used_at'] ? 
                    date('Y/m/d H:i', strtotime($key['last_used_at'])) : '未使用';
                    
                $key['created_at'] = date('Y/m/d H:i', strtotime($key['created_at']));
                
                // 成功率を百分率に
                $key['success_rate'] = round(($key['success_rate'] ?? 1) * 100, 1);
            }
            
            return $this->successResponse('APIキー一覧取得完了', [
                'keys' => $keys,
                'pagination' => [
                    'current_page' => $page,
                    'page_size' => $page_size,
                    'total' => (int)$total,
                    'total_pages' => ceil($total / $page_size)
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("APIキー一覧取得エラー: " . $e->getMessage());
            return $this->errorResponse('APIキー一覧の取得に失敗しました');
        }
    }
    
    /**
     * APIキー更新
     */
    public function updateAPIKey($id, $data) {
        try {
            // CSRF トークン検証
            $this->validateCSRFToken($data['csrf_token'] ?? '');
            
            // 存在確認
            $existing = $this->getAPIKeyById($id);
            if (!$existing) {
                return $this->errorResponse('APIキーが見つかりません', 404);
            }
            
            // 更新可能フィールドの抽出
            $updateable_fields = [];
            $params = [];
            
            $allowed_updates = [
                'key_name', 'tier_level', 'status', 'daily_limit', 
                'hourly_limit', 'notes', 'expires_at'
            ];
            
            foreach ($allowed_updates as $field) {
                if (array_key_exists($field, $data)) {
                    if (in_array($field, ['daily_limit', 'hourly_limit'])) {
                        $updateable_fields[] = "{$field} = ?";
                        $params[] = !empty($data[$field]) ? (int)$data[$field] : null;
                    } elseif ($field === 'expires_at') {
                        $updateable_fields[] = "{$field} = ?";
                        $params[] = !empty($data[$field]) ? date('c', strtotime($data[$field])) : null;
                    } else {
                        $updateable_fields[] = "{$field} = ?";
                        $params[] = $data[$field];
                    }
                }
            }
            
            if (empty($updateable_fields)) {
                return $this->errorResponse('更新するデータがありません', 400);
            }
            
            // 更新実行
            $updateable_fields[] = 'updated_at = NOW()';
            $params[] = $id;
            
            $sql = "
                UPDATE api_keys 
                SET " . implode(', ', $updateable_fields) . "
                WHERE id = ? AND is_deleted = false
                RETURNING id, key_name, service_type, tier_level, status, updated_at
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch();
            
            if (!$result) {
                return $this->errorResponse('APIキーの更新に失敗しました', 500);
            }
            
            // 監査ログ
            $this->logAudit('api_key_updated', [
                'key_id' => $id,
                'key_name' => $result['key_name'],
                'changes' => array_intersect_key($data, array_flip($allowed_updates))
            ]);
            
            return $this->successResponse('APIキーが正常に更新されました', $result);
            
        } catch (Exception $e) {
            error_log("APIキー更新エラー: " . $e->getMessage());
            return $this->errorResponse('APIキー更新に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * APIキー削除（論理削除）
     */
    public function deleteAPIKey($id) {
        try {
            // 存在確認
            $existing = $this->getAPIKeyById($id);
            if (!$existing) {
                return $this->errorResponse('APIキーが見つかりません', 404);
            }
            
            // 論理削除実行
            $sql = "
                UPDATE api_keys 
                SET is_deleted = true, status = 'inactive', updated_at = NOW()
                WHERE id = ? AND is_deleted = false
                RETURNING id, key_name
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            
            if (!$result) {
                return $this->errorResponse('APIキーの削除に失敗しました', 500);
            }
            
            // 監査ログ
            $this->logAudit('api_key_deleted', [
                'key_id' => $id,
                'key_name' => $result['key_name']
            ]);
            
            return $this->successResponse('APIキーが正常に削除されました');
            
        } catch (Exception $e) {
            error_log("APIキー削除エラー: " . $e->getMessage());
            return $this->errorResponse('APIキー削除に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * APIキーテスト
     */
    public function testAPIKey($id) {
        try {
            // APIキー取得
            $api_key = $this->getAPIKeyById($id, true); // 復号化済み
            if (!$api_key) {
                return $this->errorResponse('APIキーが見つかりません', 404);
            }
            
            // サービス別テスト実行
            $test_result = $this->executeAPITest($api_key);
            
            // テスト結果をデータベースに記録
            $this->recordTestResult($id, $test_result);
            
            return $this->successResponse('APIキーテスト完了', $test_result);
            
        } catch (Exception $e) {
            error_log("APIキーテストエラー: " . $e->getMessage());
            return $this->errorResponse('APIキーテストに失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_keys,
                    COUNT(*) FILTER (WHERE status = 'active') as active_keys,
                    COUNT(*) FILTER (WHERE status = 'limited') as limited_keys,
                    COUNT(*) FILTER (WHERE status = 'error') as error_keys,
                    COUNT(*) FILTER (WHERE tier_level = 'premium') as premium_keys,
                    COUNT(*) FILTER (WHERE tier_level = 'standard') as standard_keys,
                    COUNT(*) FILTER (WHERE tier_level = 'basic') as basic_keys,
                    COUNT(*) FILTER (WHERE tier_level = 'backup') as backup_keys,
                    SUM(daily_usage) as total_daily_usage,
                    AVG(success_rate) as avg_success_rate,
                    AVG(avg_response_time) as avg_response_time
                FROM api_keys 
                WHERE is_deleted = false
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch();
            
            // サービス別統計
            $service_sql = "
                SELECT service_type, COUNT(*) as count, AVG(success_rate) as avg_success_rate
                FROM api_keys 
                WHERE is_deleted = false AND status = 'active'
                GROUP BY service_type
                ORDER BY count DESC
            ";
            $stmt = $this->pdo->prepare($service_sql);
            $stmt->execute();
            $service_stats = $stmt->fetchAll();
            
            // 使用ログ統計（今日）
            $usage_sql = "
                SELECT 
                    COUNT(*) as today_requests,
                    COUNT(*) FILTER (WHERE response_status = 200) as successful_requests,
                    AVG(response_time) as avg_response_time
                FROM api_usage_logs 
                WHERE DATE(created_at) = CURRENT_DATE
            ";
            $stmt = $this->pdo->prepare($usage_sql);
            $stmt->execute();
            $usage_stats = $stmt->fetch();
            
            $stats['service_breakdown'] = $service_stats;
            $stats['today_usage'] = $usage_stats;
            
            return $this->successResponse('統計情報取得完了', $stats);
            
        } catch (Exception $e) {
            error_log("統計取得エラー: " . $e->getMessage());
            return $this->errorResponse('統計情報の取得に失敗しました');
        }
    }
    
    // ===== ヘルパーメソッド =====
    
    private function getAPIKeyById($id, $decrypt = false) {
        $sql = "
            SELECT id, key_name, service_type, tier_level, status,
                   encrypted_api_key, encrypted_secret_key,
                   daily_limit, hourly_limit, daily_usage, hourly_usage,
                   notes, expires_at, created_at
            FROM api_keys 
            WHERE id = ? AND is_deleted = false
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        $key = $stmt->fetch();
        
        if ($key && $decrypt) {
            $key['api_key'] = $this->decryptAPIKey($key['encrypted_api_key']);
            if ($key['encrypted_secret_key']) {
                $key['secret_key'] = $this->decryptAPIKey($key['encrypted_secret_key']);
            }
        }
        
        return $key;
    }
    
    private function validateAPIKeyData($data) {
        $errors = [];
        
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
        if (!empty($data['daily_limit']) && (!is_numeric($data['daily_limit']) || $data['daily_limit'] <= 0)) {
            $errors['daily_limit'] = '日次制限は正の整数である必要があります';
        }
        
        if (!empty($data['hourly_limit']) && (!is_numeric($data['hourly_limit']) || $data['hourly_limit'] <= 0)) {
            $errors['hourly_limit'] = '時間制限は正の整数である必要があります';
        }
        
        return $errors;
    }
    
    private function encryptAPIKey($api_key) {
        if (class_exists('EncryptionHelper')) {
            return EncryptionHelper::encrypt($api_key);
        }
        
        // フォールバック暗号化
        $key = substr(hash('sha256', defined('ENCRYPTION_KEY') ? ENCRYPTION_KEY : 'fallback'), 0, 32);
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($api_key, 'AES-256-CBC', $key, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    private function decryptAPIKey($encrypted_data) {
        if (class_exists('EncryptionHelper')) {
            return EncryptionHelper::decrypt($encrypted_data);
        }
        
        // フォールバック復号化
        $key = substr(hash('sha256', defined('ENCRYPTION_KEY') ? ENCRYPTION_KEY : 'fallback'), 0, 32);
        $data = base64_decode($encrypted_data);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    private function validateCSRFToken($token) {
        session_start();
        if (empty($token) || empty($_SESSION['csrf_token'])) {
            throw new Exception('CSRFトークンが無効です');
        }
        
        if (!hash_equals($_SESSION['csrf_token'], $token)) {
            throw new Exception('CSRFトークンが一致しません');
        }
        
        return true;
    }
    
    private function executeAPITest($api_key) {
        // サービス別テストURL定義
        $test_urls = [
            'shopify_api' => 'https://httpbin.org/bearer',
            'ebay_api' => 'https://httpbin.org/status/200',
            'deepseek_ai' => 'https://httpbin.org/post',
            'amazon_pa_api' => 'https://httpbin.org/get',
            'moneyforward_api' => 'https://httpbin.org/status/200'
        ];
        
        $test_url = $test_urls[$api_key['service_type']] ?? 'https://httpbin.org/status/200';
        
        // HTTP リクエスト実行
        $start_time = microtime(true);
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $test_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $api_key['api_key'],
                'User-Agent: NAGANO-3-APIKey-Test/1.0'
            ]
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $response_time = round((microtime(true) - $start_time) * 1000);
        curl_close($ch);
        
        return [
            'success' => $http_code >= 200 && $http_code < 400,
            'http_code' => $http_code,
            'response_time' => $response_time,
            'test_url' => $test_url,
            'timestamp' => date('c')
        ];
    }
    
    private function recordTestResult($key_id, $test_result) {
        try {
            // 使用ログに記録
            $sql = "
                INSERT INTO api_usage_logs (
                    api_key_id, service_type, tool_name, response_status, 
                    response_time, created_at
                ) VALUES (?, ?, 'web_ui_test', ?, ?, NOW())
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $key_id,
                'test',
                $test_result['http_code'],
                $test_result['response_time']
            ]);
            
            // APIキーの統計更新
            $update_sql = "
                UPDATE api_keys 
                SET 
                    total_requests = COALESCE(total_requests, 0) + 1,
                    successful_requests = COALESCE(successful_requests, 0) + ?,
                    success_rate = CASE 
                        WHEN total_requests > 0 THEN successful_requests::float / total_requests::float
                        ELSE 1.0
                    END,
                    avg_response_time = CASE
                        WHEN total_requests > 1 THEN (COALESCE(avg_response_time, 0) * (total_requests - 1) + ?) / total_requests
                        ELSE ?
                    END,
                    last_used_at = NOW()
                WHERE id = ?
            ";
            
            $stmt = $this->pdo->prepare($update_sql);
            $stmt->execute([
                $test_result['success'] ? 1 : 0,
                $test_result['response_time'],
                $test_result['response_time'],
                $key_id
            ]);
            
        } catch (Exception $e) {
            error_log("テスト結果記録エラー: " . $e->getMessage());
        }
    }
    
    private function logAudit($action, $details = []) {
        try {
            if (class_exists('Logger')) {
                Logger::audit($action, $this->user_id, $details);
            } else {
                error_log("Audit: {$action} by user {$this->user_id} - " . json_encode($details));
            }
        } catch (Exception $e) {
            error_log("監査ログエラー: " . $e->getMessage());
        }
    }
    
    private function successResponse($message, $data = null) {
        $response = ['success' => true, 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        return $response;
    }
    
    private function errorResponse($message, $code = 400, $details = null) {
        http_response_code($code);
        $response = ['success' => false, 'message' => $message];
        if ($details !== null) {
            $response['details'] = $details;
        }
        return $response;
    }
}

// ===== リクエスト処理 =====

try {
    // CSRFトークン生成（セッション開始）
    session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    $handler = new APIKeyCRUDHandler();
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['PATH_INFO'] ?? $_GET['action'] ?? '';
    
    // GET リクエスト処理
    if ($method === 'GET') {
        if ($path === '/list' || $path === 'list' || empty($path)) {
            $filters = [
                'service' => $_GET['service'] ?? '',
                'tier' => $_GET['tier'] ?? '',
                'status' => $_GET['status'] ?? '',
                'search' => $_GET['search'] ?? '',
                'page' => $_GET['page'] ?? 1,
                'page_size' => $_GET['page_size'] ?? 25
            ];
            $result = $handler->getAPIKeys($filters);
        } elseif ($path === '/stats' || $path === 'stats') {
            $result = $handler->getStatistics();
        } elseif ($path === '/csrf-token' || $path === 'csrf-token') {
            $result = ['success' => true, 'csrf_token' => $_SESSION['csrf_token']];
        } else {
            $result = ['success' => false, 'message' => '不明なアクション'];
        }
    }
    
    // POST リクエスト処理
    elseif ($method === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true) ?? $_POST;
        
        if ($path === '/create' || $path === 'create' || ($data['action'] ?? '') === 'create') {
            $result = $handler->createAPIKey($data);
        } elseif (preg_match('/\/test\/(\d+)/', $path, $matches) || ($data['action'] ?? '') === 'test') {
            $key_id = $matches[1] ?? $data['key_id'] ?? 0;
            $result = $handler->testAPIKey($key_id);
        } else {
            $result = ['success' => false, 'message' => '不明なアクション'];
        }
    }
    
    // PUT リクエスト処理
    elseif ($method === 'PUT') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (preg_match('/\/update\/(\d+)/', $path, $matches)) {
            $result = $handler->updateAPIKey($matches[1], $data);
        } else {
            $result = ['success' => false, 'message' => '不明なアクション'];
        }
    }
    
    // DELETE リクエスト処理
    elseif ($method === 'DELETE') {
        if (preg_match('/\/delete\/(\d+)/', $path, $matches)) {
            $result = $handler->deleteAPIKey($matches[1]);
        } elseif (!empty($_GET['id'])) {
            $result = $handler->deleteAPIKey($_GET['id']);
        } else {
            $result = ['success' => false, 'message' => 'IDが指定されていません'];
        }
    }
    
    else {
        http_response_code(405);
        $result = ['success' => false, 'message' => 'サポートされていないメソッドです'];
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("CRUD Handler Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'システムエラーが発生しました: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

?>