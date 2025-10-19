<?php
/**
 * 簡単なデバッグテスト用ファイル
 */

header('Content-Type: application/json; charset=utf-8');

$debugInfo = [
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'raw_input' => file_get_contents('php://input'),
    'raw_input_length' => strlen(file_get_contents('php://input')),
    'post_data' => $_POST,
    'get_data' => $_GET
];

// JSON入力のテスト
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (!empty($rawInput)) {
        $jsonData = json_decode($rawInput, true);
        $debugInfo['json_parse_success'] = json_last_error() === JSON_ERROR_NONE;
        $debugInfo['json_error'] = json_last_error_msg();
        $debugInfo['parsed_json'] = $jsonData;
        $debugInfo['action_from_json'] = $jsonData['action'] ?? 'not found';
    }
}

echo json_encode([
    'success' => true,
    'message' => 'デバッグテスト成功',
    'debug' => $debugInfo
], JSON_PRETTY_PRINT);
?>
