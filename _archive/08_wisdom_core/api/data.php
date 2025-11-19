<?php
/**
 * データ取得API
 * ファイル一覧・詳細・ツリー構造取得
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../includes/WisdomCore.php';

try {
    $wisdom = new WisdomCore();
    
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            
            $filters = [];
            if (!empty($_GET['category'])) {
                $filters['category'] = $_GET['category'];
            }
            if (!empty($_GET['keyword'])) {
                $filters['keyword'] = $_GET['keyword'];
            }
            
            $result = $wisdom->getFiles($filters, $page, $limit);
            
            echo json_encode([
                'success' => true,
                'data' => $result,
                'timestamp' => date('Y-m-d H:i:s'),
                'module' => '08_wisdom_core'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'detail':
            if (empty($_GET['id'])) {
                throw new Exception('ID is required');
            }
            
            $file = $wisdom->getFile($_GET['id']);
            
            echo json_encode([
                'success' => true,
                'data' => $file,
                'timestamp' => date('Y-m-d H:i:s'),
                'module' => '08_wisdom_core'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'tree':
            $tree = $wisdom->getTreeStructure();
            
            echo json_encode([
                'success' => true,
                'data' => $tree,
                'timestamp' => date('Y-m-d H:i:s'),
                'module' => '08_wisdom_core'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'stats':
            $stats = $wisdom->getStats();
            
            echo json_encode([
                'success' => true,
                'data' => $stats,
                'timestamp' => date('Y-m-d H:i:s'),
                'module' => '08_wisdom_core'
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
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
