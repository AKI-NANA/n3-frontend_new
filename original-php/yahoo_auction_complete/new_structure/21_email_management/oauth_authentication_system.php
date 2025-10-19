<?php
// public/auth.php - OAuth2.0認証フロー
session_start();
require_once '../vendor/autoload.php';
require_once '../config/database.php';

use Google\Client as Google_Client;

class AuthController 
{
    private $client;
    private $db;
    
    public function __construct($database) 
    {
        $this->db = $database;
        $this->initializeGoogleClient();
    }
    
    private function initializeGoogleClient() 
    {
        $this->client = new Google_Client();
        $this->client->setAuthConfig('../config/credentials.json');
        $this->client->addScope('https://www.googleapis.com/auth/gmail.modify');
        $this->client->setAccessType('offline');
        $this->client->setPrompt('select_account consent');
        $this->client->setRedirectUri($_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/auth.php');
    }
    
    /**
     * 認証開始 - Googleへリダイレクト
     */
    public function startAuth() 
    {
        $authUrl = $this->client->createAuthUrl();
        header('Location: ' . $authUrl);
        exit();
    }
    
    /**
     * 認証コールバック処理
     */
    public function handleCallback($authCode, $userId) 
    {
        try {
            // 認証コードからトークン取得
            $token = $this->client->fetchAccessTokenWithAuthCode($authCode);
            
            if (isset($token['error'])) {
                throw new Exception('認証エラー: ' . $token['error_description']);
            }
            
            // トークンを暗号化して保存
            $encryptedAccessToken = $this->encryptToken($token['access_token']);
            $encryptedRefreshToken = isset($token['refresh_token']) ? 
                $this->encryptToken($token['refresh_token']) : null;
            
            // ユーザー情報取得
            $this->client->setAccessToken($token);
            $oauth2 = new Google_Service_Oauth2($this->client);
            $userInfo = $oauth2->userinfo->get();
            
            // データベースに保存
            $this->saveUserTokens($userId, $encryptedAccessToken, $encryptedRefreshToken, $userInfo->email);
            
            // セッションに認証情報保存
            $_SESSION['user_id'] = $userId;
            $_SESSION['gmail_authenticated'] = true;
            $_SESSION['gmail_email'] = $userInfo->email;
            
            return [
                'success' => true,
                'redirect' => '/index.php',
                'message' => 'Gmail認証が完了しました'
            ];
            
        } catch (Exception $e) {
            error_log('OAuth callback error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * ユーザーのGmailトークン取得（復号化）
     */
    public function getUserTokens($userId) 
    {
        $stmt = $this->db->prepare("
            SELECT gmail_access_token, gmail_refresh_token, gmail_user_email 
            FROM user_settings 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return null;
        }
        
        return [
            'access_token' => $this->decryptToken($result['gmail_access_token']),
            'refresh_token' => $result['gmail_refresh_token'] ? 
                $this->decryptToken($result['gmail_refresh_token']) : null,
            'email' => $result['gmail_user_email']
        ];
    }
    
    /**
     * トークン暗号化
     */
    private function encryptToken($token) 
    {
        $key = $this->getEncryptionKey();
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($token, 'AES-256-CBC', $key, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * トークン復号化
     */
    private function decryptToken($encryptedToken) 
    {
        $key = $this->getEncryptionKey();
        $data = base64_decode($encryptedToken);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    /**
     * 暗号化キー取得（環境変数から）
     */
    private function getEncryptionKey() 
    {
        $key = $_ENV['GMAIL_ENCRYPTION_KEY'] ?? null;
        if (!$key) {
            throw new Exception('暗号化キーが設定されていません');
        }
        return hash('sha256', $key, true);
    }
    
    /**
     * データベースにトークン保存
     */
    private function saveUserTokens($userId, $accessToken, $refreshToken, $emailAddress) 
    {
        $stmt = $this->db->prepare("
            INSERT INTO user_settings (
                user_id, gmail_access_token, gmail_refresh_token, gmail_user_email, 
                last_sync_time, created_at
            ) VALUES (?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                gmail_access_token = VALUES(gmail_access_token),
                gmail_refresh_token = VALUES(gmail_refresh_token),
                gmail_user_email = VALUES(gmail_user_email),
                updated_at = NOW()
        ");
        
        $stmt->execute([$userId, $accessToken, $refreshToken, $emailAddress]);
    }
    
    /**
     * トークンリフレッシュ
     */
    public function refreshUserTokens($userId) 
    {
        $tokens = $this->getUserTokens($userId);
        if (!$tokens || !$tokens['refresh_token']) {
            return false;
        }
        
        try {
            $this->client->setAccessToken([
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token']
            ]);
            
            if ($this->client->isAccessTokenExpired()) {
                $newToken = $this->client->fetchAccessTokenWithRefreshToken($tokens['refresh_token']);
                
                if (isset($newToken['access_token'])) {
                    $encryptedNewToken = $this->encryptToken($newToken['access_token']);
                    
                    $stmt = $this->db->prepare("
                        UPDATE user_settings 
                        SET gmail_access_token = ?, updated_at = NOW() 
                        WHERE user_id = ?
                    ");
                    $stmt->execute([$encryptedNewToken, $userId]);
                    
                    return $newToken['access_token'];
                }
            }
            
            return $tokens['access_token'];
            
        } catch (Exception $e) {
            error_log('Token refresh error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 認証状態確認
     */
    public function isAuthenticated($userId) 
    {
        if (!isset($_SESSION['gmail_authenticated']) || !$_SESSION['gmail_authenticated']) {
            return false;
        }
        
        $tokens = $this->getUserTokens($userId);
        return $tokens !== null;
    }
    
    /**
     * 認証解除
     */
    public function revokeAuth($userId) 
    {
        try {
            // Googleからトークンを取り消し
            $tokens = $this->getUserTokens($userId);
            if ($tokens && $tokens['access_token']) {
                $this->client->revokeToken($tokens['access_token']);
            }
            
            // データベースからトークン削除
            $stmt = $this->db->prepare("
                UPDATE user_settings 
                SET gmail_access_token = NULL, gmail_refresh_token = NULL, gmail_user_email = NULL 
                WHERE user_id = ?
            ");
            $stmt->execute([$userId]);
            
            // セッションクリア
            unset($_SESSION['gmail_authenticated']);
            unset($_SESSION['gmail_email']);
            
            return true;
            
        } catch (Exception $e) {
            error_log('Auth revocation error: ' . $e->getMessage());
            return false;
        }
    }
}

// ===== 使用例とルーティング =====

try {
    $authController = new AuthController($pdo);
    $action = $_GET['action'] ?? '';
    $userId = $_SESSION['user_id'] ?? null;
    
    switch ($action) {
        case 'login':
            if (!$userId) {
                throw new Exception('ユーザーセッションが無効です');
            }
            $authController->startAuth();
            break;
            
        case 'callback':
            if (!$userId) {
                throw new Exception('ユーザーセッションが無効です');
            }
            
            $authCode = $_GET['code'] ?? null;
            if (!$authCode) {
                throw new Exception('認証コードが見つかりません');
            }
            
            $result = $authController->handleCallback($authCode, $userId);
            
            if ($result['success']) {
                header('Location: ' . $result['redirect']);
                exit();
            } else {
                $error_message = $result['error'];
            }
            break;
            
        case 'logout':
            if ($userId) {
                $authController->revokeAuth($userId);
            }
            header('Location: /login.php');
            exit();
            break;
            
        case 'status':
            if (!$userId) {
                http_response_code(401);
                echo json_encode(['authenticated' => false]);
                exit();
            }
            
            $isAuth = $authController->isAuthenticated($userId);
            header('Content-Type: application/json');
            echo json_encode([
                'authenticated' => $isAuth,
                'user_id' => $userId,
                'email' => $_SESSION['gmail_email'] ?? null
            ]);
            exit();
            break;
            
        default:
            // 認証状態確認ページ
            if (!$userId) {
                header('Location: /login.php');
                exit();
            }
            
            $isAuthenticated = $authController->isAuthenticated($userId);
            break;
    }
    
} catch (Exception $e) {
    error_log('Auth error: ' . $e->getMessage());
    $error_message = $e->getMessage();
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gmail Cleaner - 認証</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #DDF4E7 0%, #ffffff 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            color: #124170;
        }
        
        .auth-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 25px rgba(18, 65, 112, 0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        
        .auth-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #124170;
        }
        
        .auth-description {
            color: #26667F;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .btn {
            background: #26667F;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #1e4a5f;
            transform: translateY(-2px);
        }
        
        .error-message {
            background: #fef2f2;
            color: #dc2626;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #dc2626;
        }
        
        .success-message {
            background: #f0fdf4;
            color: #16a34a;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #16a34a;
        }
        
        .auth-status {
            background: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .status-authenticated {
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
        }
        
        .status-not-authenticated {
            background: #fef2f2;
            border-left: 4px solid #dc2626;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <h1 class="auth-title">
            <i class="fas fa-envelope-open-text"></i>
            Gmail Cleaner 認証
        </h1>
        
        <?php if (isset($error_message)): ?>
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <?= htmlspecialchars($error_message) ?>
            </div>
        <?php endif; ?>
        
        <?php if (isset($isAuthenticated)): ?>
            <div class="auth-status <?= $isAuthenticated ? 'status-authenticated' : 'status-not-authenticated' ?>">
                <?php if ($isAuthenticated): ?>
                    <i class="fas fa-check-circle"></i>
                    <strong>認証済み</strong><br>
                    Gmail API連携が有効です<br>
                    <small><?= htmlspecialchars($_SESSION['gmail_email'] ?? '') ?></small>
                <?php else: ?>
                    <i class="fas fa-times-circle"></i>
                    <strong>未認証</strong><br>
                    Gmail APIへの接続が必要です
                <?php endif; ?>
            </div>
            
            <?php if ($isAuthenticated): ?>
                <a href="/index.php" class="btn">
                    <i class="fas fa-arrow-right"></i>
                    アプリケーションを開く
                </a>
                <br><br>
                <a href="?action=logout" class="btn" style="background: #dc2626;">
                    <i class="fas fa-sign-out-alt"></i>
                    認証解除
                </a>
            <?php else: ?>
                <p class="auth-description">
                    Gmail Cleanerを使用するには、Googleアカウントでの認証が必要です。
                    認証後、メールの自動分類と管理が可能になります。
                </p>
                <a href="?action=login" class="btn">
                    <i class="fab fa-google"></i>
                    Googleで認証
                </a>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</body>
</html>