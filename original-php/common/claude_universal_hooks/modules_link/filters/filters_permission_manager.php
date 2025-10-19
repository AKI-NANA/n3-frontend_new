<?php
/**
 * NAGANO-3 フィルターシステム 権限管理システム
 * 
 * 機能: ユーザー認証・権限チェック・APIアクセス制御
 * 依存: PostgreSQL, セッション管理
 * 作成: 2024年版 NAGANO-3準拠
 */

class FiltersPermissionManager {
    
    private $pdo;
    private $logger;
    private $session_timeout = 7200; // 2時間
    private $api_key_cache = [];
    
    // 権限レベル定義
    private $permission_levels = [
        'public' => 0,
        'viewer' => 10,
        'operator' => 20,
        'admin' => 30,
        'super_admin' => 40
    ];
    
    // 権限マップ定義
    private $permission_map = [
        // フィルター実行権限
        'filters_execute' => 10,
        'filters_batch' => 20,
        'filters_view_logs' => 10,
        
        // NGワード管理権限
        'ngwords_view' => 10,
        'ngwords_manage' => 20,
        'ngwords_bulk_edit' => 30,
        
        // カテゴリ管理権限
        'categories_view' => 10,
        'categories_manage' => 20,
        
        // 確認待ち管理権限
        'reviews_access' => 10,
        'reviews_approve' => 20,
        'reviews_bulk_approve' => 30,
        
        // AI関連権限
        'ai_analyze' => 10,
        'ai_training' => 30,
        'ai_config' => 40,
        
        // 統計・レポート権限
        'statistics_view' => 10,
        'reports_generate' => 20,
        'reports_export' => 20,
        
        // システム設定権限
        'settings_view' => 20,
        'settings_manage' => 30,
        'settings_system' => 40,
        
        // 外部データ権限
        'external_data_sync' => 30,
        'external_data_manage' => 40,
        
        // ユーザー管理権限
        'users_view' => 30,
        'users_manage' => 40,
        
        // システム管理権限
        'system_admin' => 40
    ];
    
    public function __construct() {
        $this->initializeDatabase();
        $this->logger = $this->initializeLogger();
        $this->startSecureSession();
    }
    
    /**
     * データベース初期化
     */
    private function initializeDatabase() {
        try {
            global $pdo;
            
            if (isset($pdo) && $pdo instanceof PDO) {
                $this->pdo = $pdo;
            } else {
                // フォールバック接続
                $this->pdo = $this->createDatabaseConnection();
            }
            
        } catch (Exception $e) {
            error_log("Permission Manager Database initialization error: " . $e->getMessage());
            throw new Exception("権限管理システムのデータベース接続に失敗しました");
        }
    }
    
    /**
     * データベース接続作成
     */
    private function createDatabaseConnection() {
        $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
        $port = defined('DB_PORT') ? DB_PORT : (getenv('DB_PORT') ?: '5432');
        $dbname = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'nagano3');
        $username = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'postgres');
        $password = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');
        
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
        
        return new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    }
    
    // ===========================================
    // 認証メソッド
    // ===========================================
    
    /**
     * セッション認証
     * 
     * @return array 認証結果
     */
    public function authenticateSession() {
        try {
            // セッション有効性チェック
            if (!isset($_SESSION['user_id']) || !isset($_SESSION['login_time'])) {
                return [
                    'success' => false,
                    'message' => 'セッションが無効です'
                ];
            }
            
            // セッションタイムアウトチェック
            $current_time = time();
            $login_time = $_SESSION['login_time'];
            
            if (($current_time - $login_time) > $this->session_timeout) {
                $this->destroySession();
                return [
                    'success' => false,
                    'message' => 'セッションがタイムアウトしました'
                ];
            }
            
            // ユーザー情報取得
            $user = $this->getUserById($_SESSION['user_id']);
            if (!$user) {
                $this->destroySession();
                return [
                    'success' => false,
                    'message' => 'ユーザーが見つかりません'
                ];
            }
            
            // アクティブユーザーチェック
            if (!$user['is_active']) {
                $this->destroySession();
                return [
                    'success' => false,
                    'message' => 'ユーザーが無効化されています'
                ];
            }
            
            // セッション更新
            $_SESSION['last_activity'] = $current_time;
            
            $this->logger->debug("セッション認証成功", [
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]);
            
            return [
                'success' => true,
                'user' => $user,
                'message' => 'セッション認証成功'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("セッション認証エラー", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'セッション認証エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * APIキー認証
     * 
     * @param string $api_key APIキー
     * @return array 認証結果
     */
    public function authenticateApiKey($api_key) {
        try {
            if (empty($api_key)) {
                return [
                    'success' => false,
                    'message' => 'APIキーが指定されていません'
                ];
            }
            
            // キャッシュチェック
            if (isset($this->api_key_cache[$api_key])) {
                $cached_data = $this->api_key_cache[$api_key];
                if ((time() - $cached_data['timestamp']) < 300) { // 5分キャッシュ
                    return $cached_data['result'];
                }
            }
            
            // APIキー検証
            $api_data = $this->validateApiKey($api_key);
            if (!$api_data) {
                return [
                    'success' => false,
                    'message' => '無効なAPIキーです'
                ];
            }
            
            // 使用制限チェック
            if (!$this->checkApiKeyLimits($api_data)) {
                return [
                    'success' => false,
                    'message' => 'APIキーの使用制限に達しています'
                ];
            }
            
            // ユーザー情報取得
            $user = $this->getUserById($api_data['user_id']);
            if (!$user || !$user['is_active']) {
                return [
                    'success' => false,
                    'message' => 'APIキーに関連付けられたユーザーが無効です'
                ];
            }
            
            // 使用ログ記録
            $this->logApiKeyUsage($api_data['id'], $_SERVER['REQUEST_URI']);
            
            $result = [
                'success' => true,
                'user' => $user,
                'api_key_info' => [
                    'id' => $api_data['id'],
                    'name' => $api_data['name'],
                    'permissions' => $api_data['permissions'] ?? []
                ],
                'message' => 'APIキー認証成功'
            ];
            
            // キャッシュ保存
            $this->api_key_cache[$api_key] = [
                'result' => $result,
                'timestamp' => time()
            ];
            
            $this->logger->debug("APIキー認証成功", [
                'api_key_id' => $api_data['id'],
                'user_id' => $user['user_id'],
                'username' => $user['username']
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("APIキー認証エラー", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'APIキー認証エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * トークン認証（JWT等）
     * 
     * @param string $auth_header Authorization ヘッダー
     * @return array 認証結果
     */
    public function authenticateToken($auth_header) {
        try {
            // Bearer トークン抽出
            if (!preg_match('/Bearer\s+(.+)/', $auth_header, $matches)) {
                return [
                    'success' => false,
                    'message' => '無効なAuthorizationヘッダー形式です'
                ];
            }
            
            $token = $matches[1];
            
            // トークン検証（簡易実装）
            $token_data = $this->validateJwtToken($token);
            if (!$token_data) {
                return [
                    'success' => false,
                    'message' => '無効なトークンです'
                ];
            }
            
            // ユーザー情報取得
            $user = $this->getUserById($token_data['user_id']);
            if (!$user || !$user['is_active']) {
                return [
                    'success' => false,
                    'message' => 'トークンに関連付けられたユーザーが無効です'
                ];
            }
            
            $this->logger->debug("トークン認証成功", [
                'user_id' => $user['user_id'],
                'username' => $user['username']
            ]);
            
            return [
                'success' => true,
                'user' => $user,
                'token_info' => $token_data,
                'message' => 'トークン認証成功'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("トークン認証エラー", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'トークン認証エラー: ' . $e->getMessage()
            ];
        }
    }
    
    // ===========================================
    // 権限チェックメソッド
    // ===========================================
    
    /**
     * 権限チェック
     * 
     * @param array $user ユーザー情報
     * @param string $permission 権限名
     * @return bool 権限があるかどうか
     */
    public function hasPermission($user, $permission) {
        try {
            // システム管理者は全権限
            if ($user['role'] === 'super_admin') {
                return true;
            }
            
            // 権限マップから必要レベル取得
            if (!isset($this->permission_map[$permission])) {
                $this->logger->warning("未知の権限", ['permission' => $permission]);
                return false;
            }
            
            $required_level = $this->permission_map[$permission];
            
            // ユーザーの権限レベル取得
            $user_level = $this->getUserPermissionLevel($user);
            
            $has_permission = $user_level >= $required_level;
            
            $this->logger->debug("権限チェック", [
                'user_id' => $user['user_id'],
                'permission' => $permission,
                'required_level' => $required_level,
                'user_level' => $user_level,
                'result' => $has_permission
            ]);
            
            return $has_permission;
            
        } catch (Exception $e) {
            $this->logger->error("権限チェックエラー", [
                'permission' => $permission,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * 複数権限チェック
     * 
     * @param array $user ユーザー情報
     * @param array $permissions 権限リスト
     * @param bool $require_all 全権限必要かどうか
     * @return bool 権限があるかどうか
     */
    public function hasPermissions($user, $permissions, $require_all = true) {
        if (empty($permissions)) {
            return true;
        }
        
        $results = [];
        foreach ($permissions as $permission) {
            $results[] = $this->hasPermission($user, $permission);
        }
        
        if ($require_all) {
            return !in_array(false, $results);
        } else {
            return in_array(true, $results);
        }
    }
    
    /**
     * リソースアクセス権限チェック
     * 
     * @param array $user ユーザー情報
     * @param string $resource_type リソースタイプ
     * @param int $resource_id リソースID
     * @param string $action アクション
     * @return bool アクセス可能かどうか
     */
    public function canAccessResource($user, $resource_type, $resource_id, $action = 'read') {
        try {
            // システム管理者は全アクセス可能
            if ($user['role'] === 'super_admin') {
                return true;
            }
            
            // リソース別アクセス制御
            switch ($resource_type) {
                case 'product':
                    return $this->canAccessProduct($user, $resource_id, $action);
                    
                case 'review':
                    return $this->canAccessReview($user, $resource_id, $action);
                    
                case 'ngword':
                    return $this->canAccessNGWord($user, $resource_id, $action);
                    
                case 'report':
                    return $this->canAccessReport($user, $resource_id, $action);
                    
                default:
                    $this->logger->warning("未知のリソースタイプ", [
                        'resource_type' => $resource_type,
                        'user_id' => $user['user_id']
                    ]);
                    return false;
            }
            
        } catch (Exception $e) {
            $this->logger->error("リソースアクセス権限チェックエラー", [
                'resource_type' => $resource_type,
                'resource_id' => $resource_id,
                'action' => $action,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    // ===========================================
    // ユーザー管理メソッド
    // ===========================================
    
    /**
     * ユーザー情報取得（ID指定）
     * 
     * @param int $user_id ユーザーID
     * @return array|null ユーザー情報
     */
    private function getUserById($user_id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.role,
                    u.is_active,
                    u.created_at,
                    u.last_login_at,
                    up.permissions,
                    up.restrictions
                FROM users u
                LEFT JOIN user_permissions up ON u.id = up.user_id
                WHERE u.id = ? AND u.is_active = TRUE
            ");
            $stmt->execute([$user_id]);
            
            $user = $stmt->fetch();
            if (!$user) {
                return null;
            }
            
            // 権限情報を JSON デコード
            $user['permissions'] = $user['permissions'] ? json_decode($user['permissions'], true) : [];
            $user['restrictions'] = $user['restrictions'] ? json_decode($user['restrictions'], true) : [];
            
            return $user;
            
        } catch (Exception $e) {
            $this->logger->error("ユーザー取得エラー", [
                'user_id' => $user_id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * ユーザー権限レベル取得
     * 
     * @param array $user ユーザー情報
     * @return int 権限レベル
     */
    private function getUserPermissionLevel($user) {
        $role = $user['role'] ?? 'viewer';
        return $this->permission_levels[$role] ?? 0;
    }
    
    /**
     * ユーザーログイン
     * 
     * @param string $username ユーザー名
     * @param string $password パスワード
     * @return array ログイン結果
     */
    public function login($username, $password) {
        try {
            // ユーザー取得
            $user = $this->getUserByUsername($username);
            if (!$user) {
                $this->logFailedLogin($username, 'user_not_found');
                return [
                    'success' => false,
                    'message' => 'ユーザー名またはパスワードが無効です'
                ];
            }
            
            // パスワード検証
            if (!password_verify($password, $user['password_hash'])) {
                $this->logFailedLogin($username, 'invalid_password');
                return [
                    'success' => false,
                    'message' => 'ユーザー名またはパスワードが無効です'
                ];
            }
            
            // アクティブユーザーチェック
            if (!$user['is_active']) {
                $this->logFailedLogin($username, 'user_inactive');
                return [
                    'success' => false,
                    'message' => 'ユーザーが無効化されています'
                ];
            }
            
            // セッション開始
            $this->createUserSession($user);
            
            // ログイン時刻更新
            $this->updateLastLogin($user['user_id']);
            
            $this->logger->info("ユーザーログイン成功", [
                'user_id' => $user['user_id'],
                'username' => $username
            ]);
            
            return [
                'success' => true,
                'user' => $user,
                'message' => 'ログインしました'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("ログインエラー", [
                'username' => $username,
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'message' => 'ログインエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ユーザーログアウト
     * 
     * @return array ログアウト結果
     */
    public function logout() {
        try {
            $user_id = $_SESSION['user_id'] ?? null;
            
            $this->destroySession();
            
            if ($user_id) {
                $this->logger->info("ユーザーログアウト", ['user_id' => $user_id]);
            }
            
            return [
                'success' => true,
                'message' => 'ログアウトしました'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("ログアウトエラー", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'ログアウトエラー: ' . $e->getMessage()
            ];
        }
    }
    
    // ===========================================
    // APIキー管理メソッド
    // ===========================================
    
    /**
     * APIキー検証
     * 
     * @param string $api_key APIキー
     * @return array|null APIキー情報
     */
    private function validateApiKey($api_key) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    ak.id,
                    ak.user_id,
                    ak.name,
                    ak.permissions,
                    ak.rate_limit_per_hour,
                    ak.expires_at,
                    ak.is_active,
                    ak.created_at
                FROM api_keys ak
                WHERE ak.key_hash = ? AND ak.is_active = TRUE
            ");
            
            $key_hash = hash('sha256', $api_key);
            $stmt->execute([$key_hash]);
            
            $api_data = $stmt->fetch();
            if (!$api_data) {
                return null;
            }
            
            // 有効期限チェック
            if ($api_data['expires_at'] && strtotime($api_data['expires_at']) < time()) {
                return null;
            }
            
            // 権限情報をデコード
            $api_data['permissions'] = $api_data['permissions'] ? 
                                     json_decode($api_data['permissions'], true) : [];
            
            return $api_data;
            
        } catch (Exception $e) {
            $this->logger->error("APIキー検証エラー", ['error' => $e->getMessage()]);
            return null;
        }
    }
    
    /**
     * APIキー使用制限チェック
     * 
     * @param array $api_data APIキー情報
     * @return bool 使用可能かどうか
     */
    private function checkApiKeyLimits($api_data) {
        try {
            $api_key_id = $api_data['id'];
            $rate_limit = $api_data['rate_limit_per_hour'] ?? 1000;
            
            // 過去1時間の使用回数取得
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) 
                FROM api_key_usage_logs 
                WHERE api_key_id = ? 
                AND created_at > NOW() - INTERVAL '1 hour'
            ");
            $stmt->execute([$api_key_id]);
            
            $usage_count = $stmt->fetchColumn();
            
            return $usage_count < $rate_limit;
            
        } catch (Exception $e) {
            $this->logger->error("APIキー制限チェックエラー", ['error' => $e->getMessage()]);
            return true; // エラー時は使用許可
        }
    }
    
    /**
     * APIキー使用ログ記録
     * 
     * @param int $api_key_id APIキーID
     * @param string $endpoint 使用エンドポイント
     */
    private function logApiKeyUsage($api_key_id, $endpoint) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO api_key_usage_logs 
                (api_key_id, endpoint, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            
            $ip_address = $this->getClientIp();
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            $stmt->execute([$api_key_id, $endpoint, $ip_address, $user_agent]);
            
        } catch (Exception $e) {
            // ログ記録失敗は処理続行
            $this->logger->warning("APIキー使用ログ記録失敗", ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * APIキー生成
     * 
     * @param int $user_id ユーザーID
     * @param string $name APIキー名
     * @param array $permissions 権限リスト
     * @param int $rate_limit_per_hour 時間あたり使用制限
     * @param string $expires_at 有効期限
     * @return array 生成結果
     */
    public function generateApiKey($user_id, $name, $permissions = [], $rate_limit_per_hour = 1000, $expires_at = null) {
        try {
            // APIキー生成
            $api_key = 'nagano3_' . bin2hex(random_bytes(32));
            $key_hash = hash('sha256', $api_key);
            
            // データベース保存
            $stmt = $this->pdo->prepare("
                INSERT INTO api_keys 
                (user_id, name, key_hash, permissions, rate_limit_per_hour, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                RETURNING id
            ");
            
            $permissions_json = json_encode($permissions);
            $stmt->execute([$user_id, $name, $key_hash, $permissions_json, $rate_limit_per_hour, $expires_at]);
            
            $api_key_id = $stmt->fetchColumn();
            
            $this->logger->info("APIキー生成", [
                'api_key_id' => $api_key_id,
                'user_id' => $user_id,
                'name' => $name
            ]);
            
            return [
                'success' => true,
                'api_key' => $api_key,
                'api_key_id' => $api_key_id,
                'message' => 'APIキーを生成しました'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("APIキー生成エラー", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'APIキー生成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    // ===========================================
    // JWT トークン関連メソッド
    // ===========================================
    
    /**
     * JWT トークン検証（簡易実装）
     * 
     * @param string $token JWTトークン
     * @return array|null トークンデータ
     */
    private function validateJwtToken($token) {
        try {
            // 簡易JWT実装（実際はライブラリを使用）
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }
            
            $header = json_decode(base64_decode($parts[0]), true);
            $payload = json_decode(base64_decode($parts[1]), true);
            $signature = $parts[2];
            
            // 署名検証（簡易）
            $secret = $this->getJwtSecret();
            $expected_signature = base64_encode(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true));
            
            if (!hash_equals($expected_signature, $signature)) {
                return null;
            }
            
            // 有効期限チェック
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return null;
            }
            
            return $payload;
            
        } catch (Exception $e) {
            $this->logger->error("JWT検証エラー", ['error' => $e->getMessage()]);
            return null;
        }
    }
    
    /**
     * JWT シークレット取得
     * 
     * @return string シークレット
     */
    private function getJwtSecret() {
        return defined('JWT_SECRET') ? JWT_SECRET : 'nagano3_default_secret_change_in_production';
    }
    
    // ===========================================
    // リソースアクセス制御メソッド
    // ===========================================
    
    /**
     * 商品アクセス権限チェック
     * 
     * @param array $user ユーザー情報
     * @param int $product_id 商品ID
     * @param string $action アクション
     * @return bool アクセス可能かどうか
     */
    private function canAccessProduct($user, $product_id, $action) {
        // 基本的な商品アクセス制御
        switch ($action) {
            case 'read':
                return $this->hasPermission($user, 'filters_execute');
            case 'filter':
                return $this->hasPermission($user, 'filters_execute');
            case 'modify':
                return $this->hasPermission($user, 'filters_batch');
            default:
                return false;
        }
    }
    
    /**
     * 確認待ちアクセス権限チェック
     * 
     * @param array $user ユーザー情報
     * @param int $review_id 確認待ちID
     * @param string $action アクション
     * @return bool アクセス可能かどうか
     */
    private function canAccessReview($user, $review_id, $action) {
        switch ($action) {
            case 'read':
                return $this->hasPermission($user, 'reviews_access');
            case 'approve':
                return $this->hasPermission($user, 'reviews_approve');
            case 'bulk_approve':
                return $this->hasPermission($user, 'reviews_bulk_approve');
            default:
                return false;
        }
    }
    
    /**
     * NGワードアクセス権限チェック
     * 
     * @param array $user ユーザー情報
     * @param int $ngword_id NGワードID
     * @param string $action アクション
     * @return bool アクセス可能かどうか
     */
    private function canAccessNGWord($user, $ngword_id, $action) {
        switch ($action) {
            case 'read':
                return $this->hasPermission($user, 'ngwords_view');
            case 'create':
            case 'update':
            case 'delete':
                return $this->hasPermission($user, 'ngwords_manage');
            case 'bulk_edit':
                return $this->hasPermission($user, 'ngwords_bulk_edit');
            default:
                return false;
        }
    }
    
    /**
     * レポートアクセス権限チェック
     * 
     * @param array $user ユーザー情報
     * @param int $report_id レポートID
     * @param string $action アクション
     * @return bool アクセス可能かどうか
     */
    private function canAccessReport($user, $report_id, $action) {
        switch ($action) {
            case 'read':
                return $this->hasPermission($user, 'statistics_view');
            case 'generate':
                return $this->hasPermission($user, 'reports_generate');
            case 'export':
                return $this->hasPermission($user, 'reports_export');
            default:
                return false;
        }
    }
    
    // ===========================================
    // セッション管理メソッド
    // ===========================================
    
    /**
     * セキュアセッション開始
     */
    private function startSecureSession() {
        if (session_status() === PHP_SESSION_NONE) {
            // セッション設定
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
            ini_set('session.use_strict_mode', 1);
            
            session_start();
            
            // セッションハイジャック対策
            if (!isset($_SESSION['initialized'])) {
                session_regenerate_id(true);
                $_SESSION['initialized'] = true;
            }
        }
    }
    
    /**
     * ユーザーセッション作成
     * 
     * @param array $user ユーザー情報
     */
    private function createUserSession($user) {
        session_regenerate_id(true);
        
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    /**
     * セッション破棄
     */
    private function destroySession() {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }
            session_destroy();
        }
    }
    
    // ===========================================
    // ユーティリティメソッド
    // ===========================================
    
    /**
     * ユーザー取得（ユーザー名指定）
     * 
     * @param string $username ユーザー名
     * @return array|null ユーザー情報
     */
    private function getUserByUsername($username) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.password_hash,
                    u.role,
                    u.is_active,
                    u.created_at,
                    u.last_login_at,
                    up.permissions,
                    up.restrictions
                FROM users u
                LEFT JOIN user_permissions up ON u.id = up.user_id
                WHERE u.username = ?
            ");
            $stmt->execute([$username]);
            
            $user = $stmt->fetch();
            if (!$user) {
                return null;
            }
            
            // 権限情報をデコード
            $user['permissions'] = $user['permissions'] ? json_decode($user['permissions'], true) : [];
            $user['restrictions'] = $user['restrictions'] ? json_decode($user['restrictions'], true) : [];
            
            return $user;
            
        } catch (Exception $e) {
            $this->logger->error("ユーザー名取得エラー", [
                'username' => $username,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * 最終ログイン時刻更新
     * 
     * @param int $user_id ユーザーID
     */
    private function updateLastLogin($user_id) {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET last_login_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$user_id]);
            
        } catch (Exception $e) {
            $this->logger->warning("最終ログイン更新失敗", [
                'user_id' => $user_id,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * ログイン失敗ログ記録
     * 
     * @param string $username ユーザー名
     * @param string $reason 失敗理由
     */
    private function logFailedLogin($username, $reason) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO login_attempts 
                (username, ip_address, user_agent, reason, success, created_at)
                VALUES (?, ?, ?, ?, FALSE, NOW())
            ");
            
            $ip_address = $this->getClientIp();
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            
            $stmt->execute([$username, $ip_address, $user_agent, $reason]);
            
        } catch (Exception $e) {
            $this->logger->warning("ログイン失敗ログ記録失敗", ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * クライアントIP取得
     * 
     * @return string クライアントIP
     */
    private function getClientIp() {
        $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if ($key === 'HTTP_X_FORWARDED_FOR') {
                    $ip = explode(',', $ip)[0];
                }
                return trim($ip);
            }
        }
        
        return 'unknown';
    }
    
    /**
     * CSRF トークン検証
     * 
     * @param string $token 受信トークン
     * @return bool 検証結果
     */
    public function validateCsrfToken($token) {
        if (!isset($_SESSION['csrf_token'])) {
            return false;
        }
        
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * 新しいCSRFトークン生成
     * 
     * @return string CSRFトークン
     */
    public function generateCsrfToken() {
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        return $token;
    }
    
    /**
     * パスワード強度チェック
     * 
     * @param string $password パスワード
     * @return array チェック結果
     */
    public function validatePasswordStrength($password) {
        $errors = [];
        
        if (strlen($password) < 8) {
            $errors[] = 'パスワードは8文字以上である必要があります';
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'パスワードには大文字を含める必要があります';
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'パスワードには小文字を含める必要があります';
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'パスワードには数字を含める必要があります';
        }
        
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'パスワードには特殊文字を含める必要があります';
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'score' => $this->calculatePasswordScore($password)
        ];
    }
    
    /**
     * パスワード強度スコア計算
     * 
     * @param string $password パスワード
     * @return int スコア（0-100）
     */
    private function calculatePasswordScore($password) {
        $score = 0;
        
        // 長さによるスコア
        $score += min(strlen($password) * 4, 25);
        
        // 文字種類によるスコア
        if (preg_match('/[a-z]/', $password)) $score += 5;
        if (preg_match('/[A-Z]/', $password)) $score += 5;
        if (preg_match('/[0-9]/', $password)) $score += 5;
        if (preg_match('/[^A-Za-z0-9]/', $password)) $score += 10;
        
        // 複雑さによるスコア
        if (preg_match('/[a-z].*[A-Z]|[A-Z].*[a-z]/', $password)) $score += 10;
        if (preg_match('/[a-zA-Z].*[0-9]|[0-9].*[a-zA-Z]/', $password)) $score += 15;
        if (preg_match('/[a-zA-Z0-9].*[^A-Za-z0-9]|[^A-Za-z0-9].*[a-zA-Z0-9]/', $password)) $score += 15;
        
        // 繰り返しパターンのペナルティ
        if (preg_match('/(.)\1{2,}/', $password)) $score -= 10;
        
        return min(max($score, 0), 100);
    }
    
    /**
     * ユーザー権限一覧取得
     * 
     * @param array $user ユーザー情報
     * @return array 権限一覧
     */
    public function getUserPermissions($user) {
        $user_level = $this->getUserPermissionLevel($user);
        $permissions = [];
        
        foreach ($this->permission_map as $permission => $required_level) {
            if ($user_level >= $required_level) {
                $permissions[] = $permission;
            }
        }
        
        return $permissions;
    }
    
    /**
     * ログ初期化
     * 
     * @return object ログインスタンス
     */
    private function initializeLogger() {
        return new class {
            public function info($message, $context = []) {
                $this->log('INFO', $message, $context);
            }
            
            public function warning($message, $context = []) {
                $this->log('WARNING', $message, $context);
            }
            
            public function error($message, $context = []) {
                $this->log('ERROR', $message, $context);
            }
            
            public function debug($message, $context = []) {
                $this->log('DEBUG', $message, $context);
            }
            
            private function log($level, $message, $context) {
                $timestamp = date('Y-m-d H:i:s');
                $context_str = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
                error_log("[{$timestamp}] FILTERS_PERMISSION.{$level}: {$message}{$context_str}");
            }
        };
    }
}
?>