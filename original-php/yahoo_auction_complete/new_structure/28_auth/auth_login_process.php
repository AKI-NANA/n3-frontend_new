<?php
/**
 * ログイン処理 - POSTされたユーザー名とパスワードを受け取りセッション開始
 * 仮データでログイン成功扱い
 */
session_start();
require_once __DIR__ . '/../Authentication.php';
require_once __DIR__ . '/../Logger.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // POSTデータ検証
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POSTメソッドのみ許可');
    }

    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        throw new Exception('ユーザー名とパスワードは必須です');
    }

    // 仮データでのログイン処理（実装版では Authentication::login() を使用）
    $demo_users = [
        'admin' => ['password' => 'admin123', 'role' => 'admin', 'name' => '管理者ユーザー'],
        'demo_user' => ['password' => 'demo123', 'role' => 'user', 'name' => 'デモユーザー'],
        'tester' => ['password' => 'test123', 'role' => 'tester', 'name' => 'テストユーザー']
    ];

    if (!isset($demo_users[$username]) || $demo_users[$username]['password'] !== $password) {
        Logger::info('ログイン失敗', ['username' => $username, 'ip' => $_SERVER['REMOTE_ADDR']]);
        
        echo json_encode([
            'status' => 'error',
            'message' => 'ユーザー名またはパスワードが正しくありません',
            'data' => null,
            'timestamp' => date('c')
        ]);
        exit;
    }

    // セッション開始
    $user_data = [
        'id' => array_search($username, array_keys($demo_users)) + 1,
        'username' => $username,
        'name' => $demo_users[$username]['name'],
        'role' => $demo_users[$username]['role'],
        'login_time' => time()
    ];

    $_SESSION['user'] = $user_data;

    Logger::info('ログイン成功', ['username' => $username, 'role' => $user_data['role']]);

    echo json_encode([
        'status' => 'success',
        'message' => 'ログインに成功しました',
        'data' => [
            'user' => $user_data,
            'redirect_url' => '/index.php?page=dashboard'
        ],
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    Logger::error('ログイン処理エラー', ['error' => $e->getMessage()]);
    
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'data' => null,
        'timestamp' => date('c')
    ]);
}
?>