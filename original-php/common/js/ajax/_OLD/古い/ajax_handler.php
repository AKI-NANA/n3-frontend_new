cat > ajax_handler.php << 'EOF'
<?php
/**
 * NAGANO-3 Ajax専用ハンドラー
 * script.jsが期待する形式で応答
 */

session_start();
header('Content-Type: application/json; charset=UTF-8');

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'health_check':
    case 'php_connection_test':
    case 'connection_test':
        echo json_encode([
            'success' => true,
            'connected' => true,
            'message' => 'OK',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'update_sidebar_state':
        $_SESSION['sidebar_state'] = $_POST['state'] ?? 'expanded';
        echo json_encode([
            'success' => true,
            'state' => $_SESSION['sidebar_state']
        ]);
        break;
        
    case 'update_theme':
        $_SESSION['theme'] = $_POST['theme'] ?? 'light';
        echo json_encode([
            'success' => true,
            'theme' => $_SESSION['theme']
        ]);
        break;
        
    default:
        echo json_encode([
            'success' => true,
            'message' => 'OK'
        ]);
        break;
}
EOF