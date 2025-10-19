<?php
/**
 * 簡単なAPIテスト用ファイル
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $action = $_GET['action'] ?? 'test';
    
    switch ($action) {
        case 'test':
            echo json_encode([
                'success' => true,
                'message' => 'API動作確認OK',
                'timestamp' => date('Y-m-d H:i:s'),
                'server_info' => [
                    'php_version' => phpversion(),
                    'method' => $_SERVER['REQUEST_METHOD'],
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
                ]
            ]);
            break;
            
        case 'get_exchange_rates':
            echo json_encode([
                'success' => true,
                'rates' => [
                    'USD_JPY' => 150.0,
                    'SGD_JPY' => 110.0,
                    'MYR_JPY' => 35.0,
                    'THB_JPY' => 4.3,
                    'PHP_JPY' => 2.7,
                    'IDR_JPY' => 0.01,
                    'VND_JPY' => 0.006,
                    'TWD_JPY' => 4.8
                ],
                'last_updated' => date('Y-m-d H:i:s')
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'error' => '不明なアクション: ' . $action
            ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
