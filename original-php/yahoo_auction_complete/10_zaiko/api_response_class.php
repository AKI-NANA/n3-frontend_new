<?php
/**
 * API応答標準化クラス
 * 在庫管理システム用統一JSON応答
 */

class ApiResponse {
    private static $logger;
    
    public static function init() {
        self::$logger = new Logger('api');
    }
    
    /**
     * 成功レスポンス送信
     */
    public static function success($data = null, $message = '', $httpCode = 200) {
        $response = [
            'success' => true,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('c'),
            'execution_time' => self::getExecutionTime(),
            'memory_usage' => self::getMemoryUsage()
        ];
        
        self::sendResponse($response, $httpCode);
    }
    
    /**
     * エラーレスポンス送信
     */
    public static function error($message, $httpCode = 400, $errorCode = null, $details = null) {
        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $errorCode,
                'details' => $details
            ],
            'timestamp' => date('c'),
            'execution_time' => self::getExecutionTime(),
            'memory_usage' => self::getMemoryUsage()
        ];
        
        // エラーログ記録
        if (self::$logger) {
            self::$logger->error('API Error Response', [
                'message' => $message,
                'code' => $errorCode,
                'http_code' => $httpCode,
                'details' => $details,
                'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown'
            ]);
        }
        
        self::sendResponse($response, $httpCode);
    }
    
    /**
     * バリデーションエラーレスポンス
     */
    public static function validationError($errors, $message = 'バリデーションエラーが発生しました') {
        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => 'VALIDATION_ERROR',
                'validation_errors' => $errors
            ],
            'timestamp' => date('c'),
            'execution_time' => self::getExecutionTime(),
            'memory_usage' => self::getMemoryUsage()
        ];
        
        self::sendResponse($response, 422);
    }
    
    /**
     * 権限エラーレスポンス
     */
    public static function unauthorized($message = 'アクセスが拒否されました') {
        self::error($message, 401, 'UNAUTHORIZED');
    }
    
    /**
     * 見つからないエラーレスポンス
     */
    public static function notFound($message = 'リソースが見つかりません') {
        self::error($message, 404, 'NOT_FOUND');
    }
    
    /**
     * サーバーエラーレスポンス
     */
    public static function serverError($message = 'サーバー内部エラーが発生しました', $details = null) {
        self::error($message, 500, 'INTERNAL_SERVER_ERROR', $details);
    }
    
    /**
     * ページネーション付きレスポンス
     */
    public static function paginated($data, $totalCount, $currentPage, $perPage, $message = '') {
        $totalPages = ceil($totalCount / $perPage);
        
        $response = [
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $currentPage,
                'per_page' => $perPage,
                'total_count' => $totalCount,
                'total_pages' => $totalPages,
                'has_next_page' => $currentPage < $totalPages,
                'has_prev_page' => $currentPage > 1
            ],
            'message' => $message,
            'timestamp' => date('c'),
            'execution_time' => self::getExecutionTime(),
            'memory_usage' => self::getMemoryUsage()
        ];
        
        self::sendResponse($response, 200);
    }
    
    /**
     * レスポンス送信
     */
    private static function sendResponse($response, $httpCode) {
        // HTTPステータスコード設定
        http_response_code($httpCode);
        
        // ヘッダー設定
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        
        // CORS設定（開発環境のみ）
        if (SYSTEM_ENVIRONMENT === 'development') {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
        }
        
        // JSON出力
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        
        // ログ記録
        if (self::$logger) {
            self::$logger->info('API Response Sent', [
                'http_code' => $httpCode,
                'success' => $response['success'],
                'execution_time' => $response['execution_time'] ?? null,
                'memory_usage' => $response['memory_usage'] ?? null
            ]);
        }
        
        exit;
    }
    
    /**
     * 実行時間取得
     */
    private static function getExecutionTime() {
        static $startTime = null;
        
        if ($startTime === null) {
            $startTime = $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true);
        }
        
        $executionTime = microtime(true) - $startTime;
        return round($executionTime * 1000, 2); // ミリ秒
    }
    
    /**
     * メモリ使用量取得
     */
    private static function getMemoryUsage() {
        $memoryUsage = memory_get_usage(true);
        return [
            'bytes' => $memoryUsage,
            'mb' => round($memoryUsage / 1024 / 1024, 2),
            'peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2)
        ];
    }
    
    /**
     * リクエストデータ取得
     */
    public static function getRequestData() {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        switch ($method) {
            case 'GET':
                return $_GET;
                
            case 'POST':
            case 'PUT':
            case 'DELETE':
                $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
                
                if (strpos($contentType, 'application/json') !== false) {
                    $input = file_get_contents('php://input');
                    $data = json_decode($input, true);
                    
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        self::error('Invalid JSON format', 400, 'INVALID_JSON');
                    }
                    
                    return $data ?: [];
                } else {
                    return $_POST;
                }
                
            default:
                return [];
        }
    }
    
    /**
     * リクエストバリデーション
     */
    public static function validateRequest($rules, $data = null) {
        if ($data === null) {
            $data = self::getRequestData();
        }
        
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            
            // 必須チェック
            if (isset($rule['required']) && $rule['required'] && empty($value)) {
                $errors[$field][] = "{$field} は必須です";
                continue;
            }
            
            // 値が空の場合はスキップ
            if (empty($value)) {
                continue;
            }
            
            // 型チェック
            if (isset($rule['type'])) {
                switch ($rule['type']) {
                    case 'integer':
                        if (!is_numeric($value) || (int)$value != $value) {
                            $errors[$field][] = "{$field} は整数である必要があります";
                        }
                        break;
                        
                    case 'float':
                        if (!is_numeric($value)) {
                            $errors[$field][] = "{$field} は数値である必要があります";
                        }
                        break;
                        
                    case 'string':
                        if (!is_string($value)) {
                            $errors[$field][] = "{$field} は文字列である必要があります";
                        }
                        break;
                        
                    case 'email':
                        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = "{$field} は有効なメールアドレスである必要があります";
                        }
                        break;
                        
                    case 'url':
                        if (!filter_var($value, FILTER_VALIDATE_URL)) {
                            $errors[$field][] = "{$field} は有効なURLである必要があります";
                        }
                        break;
                }
            }
            
            // 長さチェック
            if (isset($rule['min_length']) && strlen($value) < $rule['min_length']) {
                $errors[$field][] = "{$field} は{$rule['min_length']}文字以上である必要があります";
            }
            
            if (isset($rule['max_length']) && strlen($value) > $rule['max_length']) {
                $errors[$field][] = "{$field} は{$rule['max_length']}文字以下である必要があります";
            }
            
            // 範囲チェック
            if (isset($rule['min']) && is_numeric($value) && $value < $rule['min']) {
                $errors[$field][] = "{$field} は{$rule['min']}以上である必要があります";
            }
            
            if (isset($rule['max']) && is_numeric($value) && $value > $rule['max']) {
                $errors[$field][] = "{$field} は{$rule['max']}以下である必要があります";
            }
            
            // 選択肢チェック
            if (isset($rule['in']) && !in_array($value, $rule['in'])) {
                $options = implode(', ', $rule['in']);
                $errors[$field][] = "{$field} は次のいずれかである必要があります: {$options}";
            }
        }
        
        if (!empty($errors)) {
            self::validationError($errors);
        }
        
        return $data;
    }
    
    /**
     * セキュリティヘッダー設定
     */
    public static function setSecurityHeaders() {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Content-Security-Policy: default-src \'self\'');
    }
}

// 初期化
ApiResponse::init();
?>