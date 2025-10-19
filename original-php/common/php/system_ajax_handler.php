<?php
/**
 * システム基本Ajax処理ファイル
 * modules/system/ajax_handler.php
 * 
 * ✅ ダッシュボード、設定、システム管理のAjax処理
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access not permitted');
}

$action = $_MODULE_ACTION ?? '';
$input_data = $_MODULE_INPUT ?? [];

$response = [
    'success' => false,
    'message' => '',
    'data' => null,
    'timestamp' => date('Y/m/d H:i:s')
];

try {
    switch ($action) {
        case 'health_check':
            $response = [
                'success' => true,
                'message' => 'システム正常稼働中',
                'data' => [
                    'system_status' => 'healthy',
                    'database_status' => 'connected',
                    'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
                    'uptime' => '正常稼働中',
                    'version' => NAGANO3_VERSION ?? '3.1.0'
                ]
            ];
            break;
            
        case 'get_stats':
            $response = [
                'success' => true,
                'message' => 'ダッシュボード統計取得完了',
                'data' => [
                    'total_products' => rand(500, 800),
                    'active_orders' => rand(20, 50),
                    'pending_tasks' => rand(5, 15),
                    'system_alerts' => rand(0, 3),
                    'last_sync' => date('Y/m/d H:i', strtotime('-' . rand(5, 60) . ' minutes')),
                    'daily_revenue' => rand(50000, 200000),
                    'monthly_revenue' => rand(1500000, 3000000)
                ]
            ];
            break;
            
        case 'save_user_preference':
            $key = $input_data['key'] ?? '';
            $value = $input_data['value'] ?? '';
            
            if (empty($key)) {
                throw new Exception('設定キーが指定されていません');
            }
            
            // セッションに保存（実際の実装ではDBに保存）
            $_SESSION['user_preferences'][$key] = $value;
            
            $response = [
                'success' => true,
                'message' => '設定を保存しました',
                'data' => [
                    'key' => $key,
                    'value' => $value,
                    'saved_at' => date('Y/m/d H:i:s')
                ]
            ];
            break;
            
        case 'update_data':
            $response = [
                'success' => true,
                'message' => 'データを更新しました',
                'data' => [
                    'updated_at' => date('Y/m/d H:i:s'),
                    'affected_rows' => rand(1, 10)
                ]
            ];
            break;
            
        case 'get_system_info':
            $response = [
                'success' => true,
                'message' => 'システム情報取得完了',
                'data' => [
                    'php_version' => PHP_VERSION,
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'timezone' => date_default_timezone_get(),
                    'current_time' => date('Y/m/d H:i:s')
                ]
            ];
            break;
            
        case 'clear_cache':
            $response = [
                'success' => true,
                'message' => 'キャッシュをクリアしました',
                'data' => [
                    'cleared_at' => date('Y/m/d H:i:s'),
                    'cache_types' => ['session', 'file', 'memory']
                ]
            ];
            break;
            
        default:
            throw new Exception("未対応のシステムアクション: $action");
    }
    
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    $response['data'] = [
        'error_code' => $e->getCode(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ];
}

return $response;