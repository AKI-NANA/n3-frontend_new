<?php
/**
 * eBayマネージャー セキュリティシステム v2.0 (Hook統合版)
 * security_core Hook準拠
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

/**
 * CSRF トークン検証 (security_core Hook準拠)
 */
function verify_csrf_token($token) {
    session_start();
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * 入力値サニタイゼーション (Hook統合版)
 */
function sanitize_input($input, $type = 'string') {
    switch ($type) {
        case 'int':
            return filter_var($input, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE);
            
        case 'float':
            return filter_var($input, FILTER_VALIDATE_FLOAT, FILTER_NULL_ON_FAILURE);
            
        case 'email':
            return filter_var($input, FILTER_VALIDATE_EMAIL);
            
        case 'url':
            return filter_var($input, FILTER_VALIDATE_URL);
            
        case 'string':
        default:
            return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
}

/**
 * バッチサイズバリデーション (error_prevention Hook準拠)
 */
function validate_batch_size($size) {
    $size = intval($size);
    return $size >= 10 && $size <= 200;
}

/**
 * セキュアなファイルパス検証
 */
function validate_file_path($path, $allowed_dirs = []) {
    $real_path = realpath($path);
    
    if (!$real_path || !file_exists($real_path)) {
        return false;
    }
    
    // 許可されたディレクトリ内かチェック
    if (!empty($allowed_dirs)) {
        $allowed = false;
        foreach ($allowed_dirs as $allowed_dir) {
            if (strpos($real_path, realpath($allowed_dir)) === 0) {
                $allowed = true;
                break;
            }
        }
        return $allowed;
    }
    
    return true;
}

/**
 * セキュリティログ記録 (Hook統合版)
 */
function log_security_event($event_type, $details, $severity = 'info') {
    $log_dir = __DIR__ . '/../../logs/ebay_manager/security';
    if (!is_dir($log_dir)) mkdir($log_dir, 0755, true);
    
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'event_type' => $event_type,
        'details' => $details,
        'severity' => $severity,
        'user_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'hook_integration' => 'security_core'
    ];
    
    file_put_contents(
        $log_dir . '/security_' . date('Y-m-d') . '.log',
        json_encode($log_entry, JSON_UNESCAPED_UNICODE) . "\n",
        FILE_APPEND | LOCK_EX
    );
}

/**
 * レート制限チェック (security_core Hook準拠)
 */
function check_rate_limit($identifier, $max_requests = 100, $time_window = 3600) {
    $cache_file = sys_get_temp_dir() . '/ebay_rate_limit_' . md5($identifier);
    
    $current_time = time();
    $requests = [];
    
    // 既存リクエスト履歴読み込み
    if (file_exists($cache_file)) {
        $data = file_get_contents($cache_file);
        $requests = json_decode($data, true) ?: [];
    }
    
    // 古いリクエストを削除
    $requests = array_filter($requests, function($timestamp) use ($current_time, $time_window) {
        return ($current_time - $timestamp) < $time_window;
    });
    
    // レート制限チェック
    if (count($requests) >= $max_requests) {
        log_security_event('rate_limit_exceeded', [
            'identifier' => $identifier,
            'requests_count' => count($requests),
            'max_requests' => $max_requests
        ], 'warning');
        return false;
    }
    
    // 新しいリクエストを記録
    $requests[] = $current_time;
    file_put_contents($cache_file, json_encode($requests));
    
    return true;
}

/**
 * セキュアなプロセス実行 (security_core Hook準拠)
 */
function secure_exec_python_hook($script_path, $args = []) {
    // パス検証
    $allowed_dirs = [
        __DIR__ . '/../../hooks',
        __DIR__ . '/../../scripts'
    ];
    
    if (!validate_file_path($script_path, $allowed_dirs)) {
        log_security_event('invalid_script_path', ['path' => $script_path], 'error');
        return ['success' => false, 'error' => 'Invalid script path'];
    }
    
    // 引数サニタイゼーション
    $safe_args = [];
    foreach ($args as $arg) {
        if (preg_match('/^[a-zA-Z0-9_\-\.]+$/', $arg)) {
            $safe_args[] = $arg;
        } else {
            log_security_event('invalid_script_argument', ['arg' => $arg], 'warning');
            return ['success' => false, 'error' => 'Invalid script argument'];
        }
    }
    
    // セキュアなコマンド構築
    $command = array_merge(['python3', $script_path], $safe_args);
    
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];
    
    try {
        $process = proc_open($command, $descriptors, $pipes);
        
        if (!is_resource($process)) {
            throw new Exception('Failed to start process');
        }
        
        fclose($pipes[0]);
        
        stream_set_timeout($pipes[1], 30);
        stream_set_timeout($pipes[2], 30);
        
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        
        fclose($pipes[1]);
        fclose($pipes[2]);
        
        $exit_code = proc_close($process);
        
        if ($exit_code === 0) {
            log_security_event('secure_exec_success', ['script' => basename($script_path)], 'info');
            return ['success' => true, 'output' => $output];
        } else {
            log_security_event('secure_exec_failed', [
                'script' => basename($script_path),
                'exit_code' => $exit_code,
                'error' => $error
            ], 'error');
            return ['success' => false, 'error' => $error, 'exit_code' => $exit_code];
        }
        
    } catch (Exception $e) {
        log_security_event('secure_exec_exception', [
            'script' => basename($script_path),
            'exception' => $e->getMessage()
        ], 'error');
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
