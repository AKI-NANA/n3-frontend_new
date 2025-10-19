<?php
/**
 * JWT認証システム
 * フィードバック反映：統合APIゲートウェイ用の一元的認証管理
 */

require_once 'UnifiedLogger.php';

class JWTAuth {
    private $secretKey;
    private $algorithm;
    private $issuer;
    private $logger;
    
    public function __construct($secretKey = null, $algorithm = 'HS256', $issuer = 'nagano-3') {
        $this->secretKey = $secretKey ?: $this->getSecretKey();
        $this->algorithm = $algorithm;
        $this->issuer = $issuer;
        $this->logger = getLogger('jwt_auth');
    }
    
    /**
     * JWTトークン生成
     */
    public function generateToken($userId, $permissions = [], $expirationHours = 24) {
        $header = json_encode(['typ' => 'JWT', 'alg' => $this->algorithm]);
        $payload = json_encode([
            'iss' => $this->issuer,
            'sub' => $userId,
            'user_id' => $userId,
            'permissions' => $permissions,
            'iat' => time(),
            'exp' => time() + ($expirationHours * 60 * 60),
            'jti' => $this->generateJTI(), // JWT ID for revocation
            'scope' => implode(' ', $permissions)
        ]);
        
        $base64Header = $this->base64urlEncode($header);
        $base64Payload = $this->base64urlEncode($payload);
        
        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
        $base64Signature = $this->base64urlEncode($signature);
        
        $token = $base64Header . "." . $base64Payload . "." . $base64Signature;
        
        $this->logger->info('JWT token generated', [
            'user_id' => $userId,
            'permissions' => $permissions,
            'expiration_hours' => $expirationHours
        ]);
        
        return $token;
    }
    
    /**
     * JWTトークン検証
     */
    public function validateToken($token) {
        try {
            if (empty($token)) {
                throw new Exception('Token is empty');
            }
            
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new Exception('Invalid token format');
            }
            
            [$base64Header, $base64Payload, $base64Signature] = $parts;
            
            // シグネチャ検証
            $expectedSignature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secretKey, true);
            $actualSignature = $this->base64urlDecode($base64Signature);
            
            if (!hash_equals($expectedSignature, $actualSignature)) {
                throw new Exception('Invalid signature');
            }
            
            // ペイロード復号
            $payload = json_decode($this->base64urlDecode($base64Payload), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid payload format');
            }
            
            // 有効期限確認
            if (isset($payload['exp']) && time() > $payload['exp']) {
                throw new Exception('Token has expired');
            }
            
            // 発行者確認
            if (isset($payload['iss']) && $payload['iss'] !== $this->issuer) {
                throw new Exception('Invalid issuer');
            }
            
            // トークン無効化リスト確認
            if (isset($payload['jti']) && $this->isTokenRevoked($payload['jti'])) {
                throw new Exception('Token has been revoked');
            }
            
            $this->logger->debug('JWT token validated successfully', [
                'user_id' => $payload['user_id'] ?? 'unknown',
                'permissions' => $payload['permissions'] ?? []
            ]);
            
            return $payload;
        } catch (Exception $e) {
            $this->logger->warning('JWT token validation failed', [
                'error' => $e->getMessage(),
                'token_preview' => substr($token, 0, 20) . '...'
            ]);
            return false;
        }
    }
    
    /**
     * 認証ミドルウェア
     */
    public function middleware($requiredPermission = null, $requiredLevel = 'user') {
        $startTime = microtime(true);
        
        try {
            // トークン取得
            $token = $this->extractTokenFromRequest();
            if (!$token) {
                $this->respondUnauthorized('Token required');
                return false;
            }
            
            // トークン検証
            $payload = $this->validateToken($token);
            if (!$payload) {
                $this->respondUnauthorized('Invalid token');
                return false;
            }
            
            // 権限確認
            if ($requiredPermission && !$this->hasPermission($payload, $requiredPermission)) {
                $this->respondForbidden('Insufficient permissions');
                return false;
            }
            
            // レベル確認
            if (!$this->hasRequiredLevel($payload, $requiredLevel)) {
                $this->respondForbidden('Insufficient access level');
                return false;
            }
            
            // レート制限確認
            if (!$this->checkRateLimit($payload['user_id'])) {
                $this->respondTooManyRequests('Rate limit exceeded');
                return false;
            }
            
            // リクエスト情報をグローバルに設定
            $GLOBALS['current_user'] = $payload;
            
            $this->logger->logPerformance('JWT middleware', $startTime, [
                'user_id' => $payload['user_id'],
                'permissions' => $payload['permissions'] ?? [],
                'endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown'
            ]);
            
            return $payload;
        } catch (Exception $e) {
            $this->logger->error('JWT middleware error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->respondInternalError('Authentication error');
            return false;
        }
    }
    
    /**
     * トークン無効化
     */
    public function revokeToken($token) {
        try {
            $payload = $this->validateToken($token);
            if ($payload && isset($payload['jti'])) {
                $this->addToRevokedList($payload['jti'], $payload['exp']);
                
                $this->logger->info('JWT token revoked', [
                    'jti' => $payload['jti'],
                    'user_id' => $payload['user_id'] ?? 'unknown'
                ]);
                
                return true;
            }
            return false;
        } catch (Exception $e) {
            $this->logger->error('Token revocation failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * トークンリフレッシュ
     */
    public function refreshToken($token) {
        $payload = $this->validateToken($token);
        if (!$payload) {
            return false;
        }
        
        // 期限が近い場合のみリフレッシュ
        $timeLeft = $payload['exp'] - time();
        if ($timeLeft > 3600) { // 1時間以上残っている場合はリフレッシュしない
            return $token;
        }
        
        // 古いトークンを無効化
        if (isset($payload['jti'])) {
            $this->addToRevokedList($payload['jti'], $payload['exp']);
        }
        
        // 新しいトークン生成
        $newToken = $this->generateToken(
            $payload['user_id'],
            $payload['permissions'] ?? [],
            24
        );
        
        $this->logger->info('JWT token refreshed', [
            'user_id' => $payload['user_id'],
            'old_jti' => $payload['jti'] ?? 'unknown'
        ]);
        
        return $newToken;
    }
    
    /**
     * ユーザー権限確認
     */
    public function hasPermission($payload, $requiredPermission) {
        $userPermissions = $payload['permissions'] ?? [];
        
        // 管理者権限は全てを許可
        if (in_array('admin', $userPermissions)) {
            return true;
        }
        
        // 必要な権限を持っているか確認
        return in_array($requiredPermission, $userPermissions);
    }
    
    /**
     * アクセスレベル確認
     */
    public function hasRequiredLevel($payload, $requiredLevel) {
        $levels = ['guest' => 0, 'user' => 1, 'moderator' => 2, 'admin' => 3];
        $userPermissions = $payload['permissions'] ?? [];
        
        $userLevel = 0;
        foreach ($userPermissions as $permission) {
            if (isset($levels[$permission])) {
                $userLevel = max($userLevel, $levels[$permission]);
            }
        }
        
        return $userLevel >= ($levels[$requiredLevel] ?? 1);
    }
    
    // プライベートメソッド
    private function extractTokenFromRequest() {
        // Authorizationヘッダーから取得
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (strpos($authHeader, 'Bearer ') === 0) {
                return substr($authHeader, 7);
            }
        }
        
        // クッキーから取得
        if (isset($_COOKIE['auth_token'])) {
            return $_COOKIE['auth_token'];
        }
        
        // GETパラメータから取得（非推奨だが開発用）
        if (isset($_GET['token'])) {
            return $_GET['token'];
        }
        
        return null;
    }
    
    private function getSecretKey() {
        // 環境変数または設定ファイルから取得
        return $_ENV['JWT_SECRET'] ?? 'NAGANO-3-SECRET-KEY-2025-' . date('Y-m');
    }
    
    private function generateJTI() {
        return bin2hex(random_bytes(16));
    }
    
    private function base64urlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private function base64urlDecode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }
    
    private function isTokenRevoked($jti) {
        // Redis または データベースで無効化リストを確認
        // 簡易実装：ファイルベース
        $revokedFile = '/tmp/revoked_tokens.json';
        if (!file_exists($revokedFile)) {
            return false;
        }
        
        $revokedTokens = json_decode(file_get_contents($revokedFile), true) ?: [];
        return isset($revokedTokens[$jti]) && $revokedTokens[$jti] > time();
    }
    
    private function addToRevokedList($jti, $expiration) {
        $revokedFile = '/tmp/revoked_tokens.json';
        $revokedTokens = [];
        
        if (file_exists($revokedFile)) {
            $revokedTokens = json_decode(file_get_contents($revokedFile), true) ?: [];
        }
        
        // 期限切れトークンをクリーンアップ
        $now = time();
        $revokedTokens = array_filter($revokedTokens, function($exp) use ($now) {
            return $exp > $now;
        });
        
        $revokedTokens[$jti] = $expiration;
        file_put_contents($revokedFile, json_encode($revokedTokens));
    }
    
    private function checkRateLimit($userId) {
        // 簡易レート制限：1分間に100リクエスト
        $rateLimitFile = "/tmp/rate_limit_{$userId}.json";
        $now = time();
        $minute = floor($now / 60);
        
        $rateLimitData = [];
        if (file_exists($rateLimitFile)) {
            $rateLimitData = json_decode(file_get_contents($rateLimitFile), true) ?: [];
        }
        
        // 古いデータをクリーンアップ
        $rateLimitData = array_filter($rateLimitData, function($timestamp) use ($minute) {
            return floor($timestamp / 60) >= ($minute - 1); // 直近2分のデータのみ保持
        });
        
        // 現在の分のリクエスト数を確認
        $currentMinuteRequests = array_filter($rateLimitData, function($timestamp) use ($minute) {
            return floor($timestamp / 60) === $minute;
        });
        
        if (count($currentMinuteRequests) >= 100) {
            return false; // レート制限に達している
        }
        
        // 現在のリクエストを記録
        $rateLimitData[] = $now;
        file_put_contents($rateLimitFile, json_encode($rateLimitData));
        
        return true;
    }
    
    // HTTP レスポンス送信メソッド
    private function respondUnauthorized($message) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized',
            'message' => $message,
            'timestamp' => time()
        ]);
        exit;
    }
    
    private function respondForbidden($message) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden',
            'message' => $message,
            'timestamp' => time()
        ]);
        exit;
    }
    
    private function respondTooManyRequests($message) {
        http_response_code(429);
        header('Content-Type: application/json');
        header('Retry-After: 60');
        echo json_encode([
            'success' => false,
            'error' => 'Too Many Requests',
            'message' => $message,
            'timestamp' => time()
        ]);
        exit;
    }
    
    private function respondInternalError($message) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Internal Server Error',
            'message' => $message,
            'timestamp' => time()
        ]);
        exit;
    }
}

/**
 * グローバルJWT認証インスタンス取得
 */
function getJWTAuth() {
    static $jwtAuth = null;
    
    if ($jwtAuth === null) {
        $jwtAuth = new JWTAuth();
    }
    
    return $jwtAuth;
}

/**
 * 現在のユーザー情報取得
 */
function getCurrentUser() {
    return $GLOBALS['current_user'] ?? null;
}

/**
 * 権限確認ヘルパー
 */
function hasPermission($permission) {
    $user = getCurrentUser();
    if (!$user) return false;
    
    $userPermissions = $user['permissions'] ?? [];
    return in_array('admin', $userPermissions) || in_array($permission, $userPermissions);
}

/**
 * 管理者権限確認
 */
function isAdmin() {
    return hasPermission('admin');
}
