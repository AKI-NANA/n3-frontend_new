<?php
/**
 * スキャンAPI
 * プロジェクト全体をスキャンしてコードマップを更新
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../includes/WisdomCore.php';

try {
    $wisdom = new WisdomCore();
    
    $stats = $wisdom->scanProject();
    
    echo json_encode([
        'success' => true,
        'data' => $stats,
        'message' => 'スキャン完了',
        'timestamp' => date('Y-m-d H:i:s'),
        'module' => '08_wisdom_core'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
        'module' => '08_wisdom_core'
    ], JSON_UNESCAPED_UNICODE);
}
?>
