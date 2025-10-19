<?php
/**
 * eBayテストビューアー Ajax専用ハンドラー
 * N3準拠: Ajax/HTML完全分離版
 * PHPにJavaScript/HTML混在禁止ルール適用
 */

if (!defined('SECURE_ACCESS')) define('SECURE_ACCESS', true);

// POST以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['error' => 'POST method required']);
    exit;
}

// Buffer制御
while (ob_get_level()) ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=UTF-8');

// CSRF保護
session_start();
if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
    echo json_encode(['error' => 'CSRF token invalid']);
    exit;
}

try {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'load_diagnostic_data':
            $result = loadDiagnosticData();
            break;
            
        case 'create_sample_data':
            $result = createSampleData();
            break;
            
        case 'refresh_data':
            $result = refreshData();
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Unknown action: ' . $action];
    }
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Server error: ' . $e->getMessage()
    ]);
} finally {
    ob_end_flush();
    exit;
}

/**
 * 診断データ読み込み
 */
function loadDiagnosticData() {
    try {
        // debug_data.phpの処理を統合
        require_once __DIR__ . '/debug_data_engine.php';
        
        $diagnostic = new EbayDiagnosticEngine();
        $data = $diagnostic->getCompleteData();
        
        return [
            'success' => true,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Diagnostic data load failed: ' . $e->getMessage()
        ];
    }
}

/**
 * サンプルデータ作成
 */
function createSampleData() {
    try {
        // create_sample_data.phpの処理を統合
        require_once __DIR__ . '/sample_data_engine.php';
        
        $creator = new EbaySampleDataCreator();
        $result = $creator->createData();
        
        return [
            'success' => true,
            'message' => 'Sample data created successfully',
            'created_count' => $result['created_count'] ?? 0
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Sample data creation failed: ' . $e->getMessage()
        ];
    }
}

/**
 * データ更新
 */
function refreshData() {
    try {
        // 最新データを取得
        $data = loadDiagnosticData();
        
        if ($data['success']) {
            return [
                'success' => true,
                'message' => 'Data refreshed successfully',
                'data' => $data['data'],
                'refresh_time' => date('Y-m-d H:i:s')
            ];
        } else {
            return $data;
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Data refresh failed: ' . $e->getMessage()
        ];
    }
}

?>
