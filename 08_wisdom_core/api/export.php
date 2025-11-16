<?php
/**
 * エクスポートAPI
 * code_map.json形式でエクスポート
 */

header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="code_map.json"');

require_once __DIR__ . '/../includes/WisdomCore.php';

try {
    $wisdom = new WisdomCore();
    echo $wisdom->exportToJson();
    
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
