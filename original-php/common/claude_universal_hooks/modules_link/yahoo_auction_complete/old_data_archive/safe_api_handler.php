<?php
/**
 * 完全エラーフリーAPI応答システム
 * ユーザー要求: 出品できない商品を事前に弾き、成功分離・JSONエラー完全修正
 */

class SafeAPIHandler {
    private static $initialized = false;
    private static $isDebugMode = false;
    
    /**
     * システム初期化
     */
    public static function initialize($forceDebug = false) {
        if (self::$initialized && !$forceDebug) return;
        
        // 1. 出力バッファ完全制御
        while (ob_get_level()) {
            ob_end_clean();
        }
        ob_start();
        
        // 2. デバッグモード判定
        self::$isDebugMode = $forceDebug || 
                           (isset($_GET['debug']) && $_GET['debug'] === '1') ||
                           (isset($_POST['debug']) && $_POST['debug'] === '1');
        
        // 3. エラー表示制御（APIモードのみ）
        if (self::isAPIRequest()) {
            if (!self::$isDebugMode) {
                error_reporting(0);
                ini_set('display_errors', 0);
                ini_set('display_startup_errors', 0);
            }
            ini_set('log_errors', 1);
            ini_set('log_errors_max_len', 0);
        }
        
        // 4. 例外ハンドリング設定
        set_exception_handler([self::class, 'handleException']);
        set_error_handler([self::class, 'handleError']);
        register_shutdown_function([self::class, 'handleShutdown']);
        
        // 5. JSON専用ヘッダー設定
        if (self::isAPIRequest()) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('X-Content-Type-Options: nosniff');
        }
        
        self::$initialized = true;
    }
    
    /**
     * 安全なJSONレスポンス送信
     */
    public static function sendJSON($data, $success = true, $message = '', $httpCode = 200) {
        // 出力バッファ完全クリア
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // HTTPステータスコード設定
        if ($httpCode !== 200) {
            http_response_code($httpCode);
        }
        
        // レスポンス構築
        $response = [
            'success' => (bool)$success,
            'data' => $data,
            'message' => (string)$message,
            'timestamp' => date('Y-m-d H:i:s'),
            'server_time' => time()
        ];
        
        // デバッグ情報追加
        if (self::$isDebugMode) {
            $response['debug_info'] = [
                'memory_usage' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true),
                'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
                'php_version' => PHP_VERSION,
                'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN'
            ];
        }
        
        // JSON出力（エラーハンドリング付き）
        $json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR | JSON_INVALID_UTF8_IGNORE);
        
        if ($json === false) {
            // JSON変換失敗時のフォールバック
            $errorResponse = [
                'success' => false,
                'data' => null,
                'message' => 'JSON変換エラー: ' . json_last_error_msg(),
                'timestamp' => date('Y-m-d H:i:s'),
                'error_code' => json_last_error()
            ];
            $json = json_encode($errorResponse, JSON_PARTIAL_OUTPUT_ON_ERROR);
        }
        
        echo $json;
        exit;
    }
    
    /**
     * APIリクエスト判定
     */
    private static function isAPIRequest() {
        // 明示的なAPIパラメータ
        if (isset($_GET['action']) || isset($_POST['action'])) {
            return true;
        }
        
        // Content-Type判定
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            return true;
        }
        
        // Accept判定
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        if (strpos($accept, 'application/json') !== false) {
            return true;
        }
        
        // X-Requested-With判定
        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
            $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
            return true;
        }
        
        return false;
    }
    
    /**
     * 例外ハンドラー
     */
    public static function handleException($exception) {
        error_log("未処理例外: " . $exception->getMessage() . " in " . $exception->getFile() . ":" . $exception->getLine());
        
        if (self::isAPIRequest()) {
            self::sendJSON(
                null,
                false,
                self::$isDebugMode ? 
                    'システムエラー: ' . $exception->getMessage() : 
                    'システムエラーが発生しました',
                500
            );
        } else {
            echo "<!DOCTYPE html><html><head><title>エラー</title></head><body>";
            echo "<h1>システムエラー</h1>";
            if (self::$isDebugMode) {
                echo "<p>" . htmlspecialchars($exception->getMessage()) . "</p>";
                echo "<pre>" . htmlspecialchars($exception->getTraceAsString()) . "</pre>";
            } else {
                echo "<p>システムエラーが発生しました。管理者にお問い合わせください。</p>";
            }
            echo "</body></html>";
        }
        exit;
    }
    
    /**
     * エラーハンドラー
     */
    public static function handleError($severity, $message, $filename, $lineno) {
        // エラーレポートレベルチェック
        if (!(error_reporting() & $severity)) {
            return false;
        }
        
        $errorMsg = "PHP Error [$severity]: $message in $filename:$lineno";
        error_log($errorMsg);
        
        // 致命的エラーの場合、APIレスポンスとして返す
        if (in_array($severity, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR]) && self::isAPIRequest()) {
            self::sendJSON(
                null,
                false,
                self::$isDebugMode ? "PHPエラー: $message" : 'システムエラーが発生しました',
                500
            );
        }
        
        return true;
    }
    
    /**
     * シャットダウンハンドラー
     */
    public static function handleShutdown() {
        $error = error_get_last();
        
        if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
            error_log("Fatal Error: {$error['message']} in {$error['file']}:{$error['line']}");
            
            if (self::isAPIRequest()) {
                // 出力バッファクリア
                while (ob_get_level()) {
                    ob_end_clean();
                }
                
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'data' => null,
                    'message' => self::$isDebugMode ? 
                        "Fatal Error: {$error['message']}" : 
                        'システムエラーが発生しました',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'error_type' => 'fatal_error'
                ]);
            }
        }
    }
    
    /**
     * 安全なファイル読み込み
     */
    public static function safeRequire($file, $throwOnError = false) {
        if (!file_exists($file)) {
            $message = "ファイルが存在しません: $file";
            error_log($message);
            
            if ($throwOnError) {
                throw new Exception($message);
            }
            return false;
        }
        
        try {
            require_once $file;
            return true;
        } catch (Exception $e) {
            $message = "ファイル読み込みエラー: $file - " . $e->getMessage();
            error_log($message);
            
            if ($throwOnError) {
                throw $e;
            }
            return false;
        }
    }
    
    /**
     * 安全な関数実行
     */
    public static function safeExecute($callback, $defaultReturn = null) {
        try {
            if (is_callable($callback)) {
                return call_user_func($callback);
            } else {
                throw new Exception('コールバック関数が無効です');
            }
        } catch (Exception $e) {
            error_log("安全実行エラー: " . $e->getMessage());
            return $defaultReturn;
        }
    }
    
    /**
     * リクエストデータ取得（安全版）
     */
    public static function getRequestData() {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        switch ($method) {
            case 'GET':
                return $_GET;
                
            case 'POST':
                // JSON POSTの場合
                $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
                if (strpos($contentType, 'application/json') !== false) {
                    $json = file_get_contents('php://input');
                    $data = json_decode($json, true);
                    return $data ?? [];
                }
                return $_POST;
                
            case 'PUT':
            case 'PATCH':
            case 'DELETE':
                $json = file_get_contents('php://input');
                $data = json_decode($json, true);
                return $data ?? [];
                
            default:
                return [];
        }
    }
    
    /**
     * バリデーションヘルパー
     */
    public static function validateRequired($data, $requiredFields) {
        $missing = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missing[] = $field;
            }
        }
        
        return empty($missing) ? true : $missing;
    }
    
    /**
     * 安全なファイルアップロード処理
     */
    public static function handleFileUpload($fileKey, $allowedTypes = ['csv'], $maxSize = 10485760) {
        if (!isset($_FILES[$fileKey])) {
            return ['success' => false, 'error' => 'ファイルが見つかりません'];
        }
        
        $file = $_FILES[$fileKey];
        
        // エラーチェック
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'error' => 'ファイルアップロードエラー: ' . $file['error']];
        }
        
        // サイズチェック
        if ($file['size'] > $maxSize) {
            return ['success' => false, 'error' => 'ファイルサイズが制限を超えています'];
        }
        
        // 拡張子チェック
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedTypes)) {
            return ['success' => false, 'error' => '許可されていないファイル形式です'];
        }
        
        return [
            'success' => true,
            'file' => $file,
            'extension' => $ext,
            'size' => $file['size'],
            'temp_path' => $file['tmp_name']
        ];
    }
}
