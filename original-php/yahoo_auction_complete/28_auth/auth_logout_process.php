<?php
/**
 * ログアウト処理 - セッション破棄＋ログイン画面リダイレクト
 */
session_start();
require_once __DIR__ . '/../Logger.php';

try {
    // ログアウトログ記録（セッション破棄前）
    if (isset($_SESSION['user'])) {
        Logger::info('ログアウト', [
            'username' => $_SESSION['user']['username'],
            'session_duration' => time() - $_SESSION['user']['login_time']
        ]);
    }

    // セッション完全破棄
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();

    // JSON API形式でのレスポンス（Ajax用）
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'success',
            'message' => 'ログアウトしました',
            'data' => ['redirect_url' => '/login.php'],
            'timestamp' => date('c')
        ]);
    } else {
        // 通常リダイレクト
        header('Location: /login.php');
        exit;
    }

} catch (Exception $e) {
    Logger::error('ログアウト処理エラー', ['error' => $e->getMessage()]);
    
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'ログアウト処理でエラーが発生しました',
        'data' => null,
        'timestamp' => date('c')
    ]);
}
?>