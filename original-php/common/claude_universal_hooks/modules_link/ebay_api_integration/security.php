<?php
/**
 * eBay API統合システム セキュリティ設定
 */

if (!defined('SECURE_ACCESS')) die('Direct access not allowed');

/**
 * CSRF トークン検証
 */
function verify_ebay_csrf_token($token) {
    session_start();
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * 入力値サニタイズ
 */
function sanitize_ebay_input($input) {
    if (is_array($input)) {
        return array_map('sanitize_ebay_input', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * 数値範囲バリデーション
 */
function validate_fetch_limit($limit) {
    $limit = (int)$limit;
    return max(10, min(200, $limit)); // 10-200件の範囲に制限
}

/**
 * レート制限チェック
 */
function check_rate_limit($identifier = null) {
    if (!$identifier) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    $cache_dir = '/Users/aritahiroaki/NAGANO-3/N3-Development/cache/rate_limits';
    if (!is_dir($cache_dir)) {
        mkdir($cache_dir, 0755, true);
    }
    
    $cache_file = $cache_dir . '/' . md5($identifier) . '.cache';
    $current_time = time();
    
    // キャッシュファイル読み込み
    if (file_exists($cache_file)) {
        $data = json_decode(file_get_contents($cache_file), true);
        if ($data && isset($data['requests'], $data['window_start'])) {
            // 1時間ウィンドウ
            if ($current_time - $data['window_start'] < 3600) {
                if ($data['requests'] >= 100) { // 1時間100回制限
                    return false;
                }
                $data['requests']++;
            } else {
                // 新しいウィンドウ
                $data = ['requests' => 1, 'window_start' => $current_time];
            }
        } else {
            $data = ['requests' => 1, 'window_start' => $current_time];
        }
    } else {
        $data = ['requests' => 1, 'window_start' => $current_time];
    }
    
    // キャッシュ更新
    file_put_contents($cache_file, json_encode($data));
    
    return true;
}

/**
 * セキュアヘッダー設定
 */
function set_ebay_security_headers() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

/**
 * セキュリティログ記録
 */
function log_security_event($event_type, $details = []) {
    $log_dir = '/Users/aritahiroaki/NAGANO-3/N3-Development/logs/ebay_manager/security';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_file = $log_dir . '/security_' . date('Y-m-d') . '.log';
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'event_type' => $event_type,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'details' => $details
    ];
    
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
}

/**
 * Hook統合セキュリティ検証
 */
function verify_hook_security($action, $parameters = []) {
    // Hook実行前のセキュリティチェック
    $security_checks = [
        'csrf_token_valid' => verify_ebay_csrf_token($parameters['csrf_token'] ?? ''),
        'rate_limit_ok' => check_rate_limit(),
        'action_valid' => in_array($action, ['fetch_ebay_data', 'get_integration_status', 'test_connection', 'get_inventory_stats']),
        'parameters_safe' => validate_security_parameters($parameters)
    ];
    
    // セキュリティチェック結果
    $all_passed = array_reduce($security_checks, function($carry, $check) {
        return $carry && $check;
    }, true);
    
    if (!$all_passed) {
        log_security_event('hook_security_violation', [
            'action' => $action,
            'checks' => $security_checks,
            'parameters' => array_keys($parameters)
        ]);
    }
    
    return [
        'passed' => $all_passed,
        'checks' => $security_checks
    ];
}

/**
 * パラメータセキュリティ検証
 */
function validate_security_parameters($parameters) {
    foreach ($parameters as $key => $value) {
        // 危険なパターンチェック
        if (is_string($value)) {
            $dangerous_patterns = [
                '/\<script\>/i',
                '/javascript:/i',
                '/on\w+\s*=/i',
                '/\.\.\//i',
                '/union\s+select/i'
            ];
            
            foreach ($dangerous_patterns as $pattern) {
                if (preg_match($pattern, $value)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// セキュリティヘッダー自動設定
if (!headers_sent()) {
    set_ebay_security_headers();
}
?>
