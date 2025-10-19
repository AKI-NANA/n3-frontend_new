<?php
/**
 * 共通関数ライブラリ（重複回避版）
 */

/**
 * HTML エスケープ
 */
if (!function_exists('h')) {
    function h($str) {
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }
}

/**
 * JSON レスポンス送信（重複回避版）
 * 既に定義されている場合はスキップ
 */
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($data, $success = true, $message = '') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $success,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'source' => 'common_functions.php'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * CSRF トークン生成
 */
if (!function_exists('generateCSRFToken')) {
    function generateCSRFToken() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
}

/**
 * CSRF トークン検証
 */
if (!function_exists('validateCSRFToken')) {
    function validateCSRFToken($token) {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
}

// システム初期化ログ（ログ関数が存在する場合のみ）
if (function_exists('logSystemMessage')) {
    logSystemMessage('common_functions.php 読み込み完了', 'INFO');
}
?>
