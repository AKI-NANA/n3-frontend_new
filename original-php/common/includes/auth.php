<?php
/**
 * NAGANO-3 認証システム（簡易版）
 * N3統合eBayデータビューア用
 */

if (!defined('NAGANO3_SYSTEM')) {
    die('Direct access not allowed');
}

// セッション開始（未開始の場合）
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

/**
 * 基本認証チェック（開発環境用）
 */
function checkBasicAuth() {
    // 開発環境では認証をスキップ
    if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
        return true;
    }
    
    // 本番環境での認証ロジック（将来実装）
    return true;
}

/**
 * セッションベース認証チェック
 */
function checkSessionAuth() {
    // セッションにユーザー情報があるかチェック
    if (!isset($_SESSION['authenticated'])) {
        $_SESSION['authenticated'] = true; // 開発環境では自動認証
        $_SESSION['user_id'] = 'dev_user';
        $_SESSION['user_name'] = '開発ユーザー';
    }
    
    return $_SESSION['authenticated'] ?? false;
}

/**
 * 管理者権限チェック
 */
function checkAdminAuth() {
    if (!checkSessionAuth()) {
        return false;
    }
    
    // 開発環境では管理者権限を付与
    if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
        $_SESSION['is_admin'] = true;
        return true;
    }
    
    return $_SESSION['is_admin'] ?? false;
}

/**
 * API アクセス権限チェック
 */
function checkApiAuth() {
    // 基本認証チェック
    if (!checkSessionAuth()) {
        return false;
    }
    
    // CSRF トークンチェック（POST時）
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['csrf_token'] ?? '';
        if (empty($token) || !verify_csrf_token($token)) {
            return false;
        }
    }
    
    return true;
}

/**
 * ページアクセス権限チェック
 */
function checkPageAccess($page = '') {
    // 基本認証
    if (!checkSessionAuth()) {
        return false;
    }
    
    // 特定ページの権限チェック（将来拡張）
    $restrictedPages = ['admin_panel', 'system_settings'];
    
    if (in_array($page, $restrictedPages)) {
        return checkAdminAuth();
    }
    
    return true;
}

/**
 * ログイン処理（簡易版）
 */
function performLogin($username, $password) {
    // 開発環境では常にログイン成功
    if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
        $_SESSION['authenticated'] = true;
        $_SESSION['user_id'] = $username ?: 'dev_user';
        $_SESSION['user_name'] = $username ?: '開発ユーザー';
        $_SESSION['login_time'] = time();
        return true;
    }
    
    // 本番環境での認証ロジック（将来実装）
    // データベースでの認証、パスワードハッシュチェックなど
    
    return false;
}

/**
 * ログアウト処理
 */
function performLogout() {
    // セッション変数をクリア
    $_SESSION = [];
    
    // セッションクッキーを削除
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }
    
    // セッションを破棄
    session_destroy();
    
    return true;
}

/**
 * ユーザー情報取得
 */
function getCurrentUser() {
    if (!checkSessionAuth()) {
        return null;
    }
    
    return [
        'id' => $_SESSION['user_id'] ?? 'unknown',
        'name' => $_SESSION['user_name'] ?? 'Unknown User',
        'is_admin' => $_SESSION['is_admin'] ?? false,
        'login_time' => $_SESSION['login_time'] ?? null
    ];
}

/**
 * IP アドレス制限チェック（将来実装）
 */
function checkIpRestriction() {
    // 開発環境では制限なし
    if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
        return true;
    }
    
    // 許可されたIPアドレス一覧（設定ファイルから読み込み）
    $allowedIps = ['127.0.0.1', '::1'];
    
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
    
    return in_array($clientIp, $allowedIps);
}

/**
 * セッション有効期限チェック
 */
function checkSessionExpiry($maxLifetime = 3600) {
    if (!isset($_SESSION['last_activity'])) {
        $_SESSION['last_activity'] = time();
        return true;
    }
    
    $elapsed = time() - $_SESSION['last_activity'];
    
    if ($elapsed > $maxLifetime) {
        performLogout();
        return false;
    }
    
    $_SESSION['last_activity'] = time();
    return true;
}

/**
 * 権限不足時のリダイレクト
 */
function redirectToLogin($message = '') {
    if (!empty($message)) {
        $_SESSION['auth_error'] = $message;
    }
    
    $loginUrl = '/login.php';
    if (isset($_SERVER['REQUEST_URI'])) {
        $loginUrl .= '?redirect=' . urlencode($_SERVER['REQUEST_URI']);
    }
    
    header("Location: {$loginUrl}");
    exit;
}

/**
 * API権限エラーレスポンス
 */
function sendAuthError($message = 'Authentication required') {
    http_response_code(401);
    header('Content-Type: application/json');
    
    $response = [
        'success' => false,
        'error' => $message,
        'error_code' => 'AUTH_REQUIRED',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// ===== 初期化処理 =====

// セッション有効期限チェック
if (!checkSessionExpiry()) {
    // セッション期限切れ
    if (defined('API_ENDPOINT') || strpos($_SERVER['REQUEST_URI'], '.json') !== false) {
        sendAuthError('Session expired');
    }
}

// 基本認証実行（自動）
checkBasicAuth();
checkSessionAuth();

// デバッグ情報
if (defined('DEBUG_MODE') && DEBUG_MODE === true) {
    if (function_exists('write_log')) {
        write_log('認証システム初期化完了 - ユーザー: ' . ($_SESSION['user_name'] ?? 'Guest'), 'DEBUG');
    }
}
?>