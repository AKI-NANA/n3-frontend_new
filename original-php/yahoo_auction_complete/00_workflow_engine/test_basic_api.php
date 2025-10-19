<?php
/**
 * 超シンプルなAPI動作確認
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'success' => true,
    'message' => '8080ポートAPI正常動作',
    'timestamp' => date('Y-m-d H:i:s'),
    'port' => '8080',
    'test' => 'ok'
]);
?>
