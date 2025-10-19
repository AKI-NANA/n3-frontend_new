<?php
/**
 * eBay出品停止API - HTTP 503対応版
 * 
 * リクエスト詳細ログ・リトライ機能・APIヘッダー最適化
 */

// セキュリティ確認
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// エラーログを有効化
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/ebay_api_debug_detailed.log');

// JSON応答設定
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

// POST以外は拒否
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// CSRF トークン確認（開発時は緩和）
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// リクエストデータ取得
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit;
}

$ebay_item_id = $input['ebay_item_id'] ?? '';
$action = $input['action'] ?? '';
$reason = $input['reason'] ?? 'OtherListingError';

// バリデーション
if (empty($ebay_item_id)) {
    echo json_encode(['success' => false, 'error' => 'eBay Item ID required']);
    exit;
}

if ($action !== 'end_listing') {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
    exit;
}

// 詳細ログ関数
function logDetail($message, $data = []) {
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] {$message}";
    if (!empty($data)) {
        $log_entry .= " | " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    error_log($log_entry . "\n");
}

logDetail("=== eBay API詳細デバッグ開始 ===");
logDetail("リクエスト", [
    'ebay_item_id' => $ebay_item_id,
    'action' => $action,
    'reason' => $reason,
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A',
    'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'N/A'
]);

try {
    // 🔧 .envから直接認証情報を読み込み
    logDetail("環境変数読み込み開始");
    
    // .envファイル読み込み
    $env_file = __DIR__ . '/../../.env';
    if (!file_exists($env_file)) {
        throw new Exception('.envファイルが見つかりません: ' . $env_file);
    }
    
    $env_content = file_get_contents($env_file);
    preg_match_all('/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/m', $env_content, $matches);
    
    $env_vars = [];
    for ($i = 0; $i < count($matches[0]); $i++) {
        $key = $matches[1][$i];
        $value = trim($matches[2][$i], '"\'');
        $env_vars[$key] = $value;
    }
    
    // eBay認証情報を取得
    $ebay_config = [
        'app_id' => $env_vars['EBAY_CLIENT_ID'] ?? '',
        'dev_id' => $env_vars['EBAY_DEV_ID'] ?? '',
        'cert_id' => $env_vars['EBAY_CLIENT_SECRET'] ?? '',
        'token' => $env_vars['EBAY_USER_ACCESS_TOKEN'] ?? '',
        'environment' => $env_vars['EBAY_ENVIRONMENT'] ?? 'production'
    ];
    
    logDetail("eBay設定取得", [
        'app_id' => substr($ebay_config['app_id'], 0, 20) . '...',
        'dev_id' => substr($ebay_config['dev_id'], 0, 20) . '...',
        'cert_id' => substr($ebay_config['cert_id'], 0, 20) . '...',
        'token' => substr($ebay_config['token'], 0, 20) . '...',
        'environment' => $ebay_config['environment']
    ]);
    
    // 必須項目チェック
    foreach (['app_id', 'dev_id', 'cert_id', 'token'] as $required) {
        if (empty($ebay_config[$required])) {
            throw new Exception("eBay設定項目が不足: {$required}");
        }
    }
    
    // 🎯 直接eBay API呼び出し（最適化版）
    
    // API エンドポイント
    $endpoint = $ebay_config['environment'] === 'sandbox' 
        ? 'https://api.sandbox.ebay.com/ws/api.dll'
        : 'https://api.ebay.com/ws/api.dll';
    
    logDetail("APIエンドポイント", ['endpoint' => $endpoint]);
    
    // XML リクエスト構築（最適化・503対策）
    $xml_request = '<?xml version="1.0" encoding="utf-8"?>' . 
    '<EndFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">' .
    '<RequesterCredentials>' .
    '<eBayAuthToken>' . htmlspecialchars($ebay_config['token'], ENT_QUOTES, 'UTF-8') . '</eBayAuthToken>' .
    '</RequesterCredentials>' .
    '<ItemID>' . htmlspecialchars($ebay_item_id, ENT_QUOTES, 'UTF-8') . '</ItemID>' .
    '<EndingReason>' . htmlspecialchars($reason, ENT_QUOTES, 'UTF-8') . '</EndingReason>' .
    '<ErrorLanguage>en_US</ErrorLanguage>' .
    '<WarningLevel>High</WarningLevel>' .
    '</EndFixedPriceItemRequest>';
    
    logDetail("XML リクエスト", ['xml' => $xml_request]);
    
    // HTTPヘッダー（503対策・最適化版）
    $headers = [
        'X-EBAY-API-COMPATIBILITY-LEVEL: 1193',
        'X-EBAY-API-DEV-NAME: ' . $ebay_config['dev_id'],
        'X-EBAY-API-APP-NAME: ' . $ebay_config['app_id'],
        'X-EBAY-API-CERT-NAME: ' . $ebay_config['cert_id'],
        'X-EBAY-API-CALL-NAME: EndFixedPriceItem',
        'X-EBAY-API-SITEID: 0',
        'Content-Type: text/xml; charset=utf-8',
        'Content-Length: ' . strlen($xml_request),
        'User-Agent: CAIDS-eBayClient/2.0 (compatible; PHP/' . PHP_VERSION . ')',
        'Accept: text/xml',
        'Accept-Charset: utf-8',
        'Connection: close',
        'Cache-Control: no-cache'
    ];
    
    logDetail("HTTPヘッダー", ['headers' => $headers]);
    
    // 🔄 リトライ機能付きcURL（503対策）
    $max_retries = 3;
    $retry_delay = 1; // 秒
    
    for ($retry = 0; $retry <= $max_retries; $retry++) {
        logDetail("API呼び出し試行", ['retry' => $retry, 'max_retries' => $max_retries]);
        
        // cURL初期化（最適化設定）
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $endpoint,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $xml_request,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 60,           // タイムアウトを60秒に延長
            CURLOPT_CONNECTTIMEOUT => 30,    // 接続タイムアウト30秒
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXREDIRS => 0,
            CURLOPT_ENCODING => '',          // 圧縮対応
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1, // HTTP/1.1を明示
            CURLOPT_FRESH_CONNECT => true,   // 新しい接続を強制
            CURLOPT_FORBID_REUSE => true     // 接続の再利用を禁止
        ]);
        
        // API実行
        $start_time = microtime(true);
        $response = curl_exec($ch);
        $end_time = microtime(true);
        
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        $curl_info = curl_getinfo($ch);
        
        curl_close($ch);
        
        $response_time = round(($end_time - $start_time) * 1000, 2);
        
        logDetail("cURL実行結果", [
            'http_code' => $http_code,
            'response_time' => $response_time . 'ms',
            'curl_error' => $curl_error,
            'response_length' => strlen($response),
            'curl_info' => [
                'total_time' => $curl_info['total_time'],
                'namelookup_time' => $curl_info['namelookup_time'],
                'connect_time' => $curl_info['connect_time'],
                'pretransfer_time' => $curl_info['pretransfer_time'],
                'starttransfer_time' => $curl_info['starttransfer_time']
            ]
        ]);
        
        // cURLエラーチェック
        if ($curl_error) {
            logDetail("cURLエラー", ['error' => $curl_error]);
            if ($retry < $max_retries) {
                logDetail("リトライ待機", ['delay' => $retry_delay]);
                sleep($retry_delay);
                $retry_delay *= 2; // 指数バックオフ
                continue;
            } else {
                throw new Exception("cURLエラー: {$curl_error}");
            }
        }
        
        // HTTP 503の場合はリトライ
        if ($http_code === 503) {
            logDetail("HTTP 503エラー - リトライ実行", ['retry' => $retry]);
            if ($retry < $max_retries) {
                sleep($retry_delay);
                $retry_delay *= 2;
                continue;
            } else {
                throw new Exception("eBay APIサーバーが利用できません (HTTP 503 - 最大リトライ回数到達)");
            }
        }
        
        // HTTP 200以外の場合
        if ($http_code !== 200) {
            logDetail("HTTPエラー", [
                'code' => $http_code, 
                'response' => substr($response, 0, 500)
            ]);
            
            if ($retry < $max_retries && in_array($http_code, [500, 502, 503, 504])) {
                sleep($retry_delay);
                $retry_delay *= 2;
                continue;
            } else {
                throw new Exception("HTTPエラー: {$http_code}");
            }
        }
        
        // 成功した場合はループを抜ける
        logDetail("API呼び出し成功", ['retry_count' => $retry]);
        break;
    }
    
    logDetail("XML応答", ['response' => $response]);
    
    // XML応答解析
    $xml = simplexml_load_string($response);
    if (!$xml) {
        throw new Exception('XML応答の解析に失敗しました');
    }
    
    // 名前空間を考慮
    $xml->registerXPathNamespace('ebay', 'urn:ebay:apis:eBLBaseComponents');
    $ackNodes = $xml->xpath('//ebay:Ack');
    $ack = !empty($ackNodes) ? (string)$ackNodes[0] : (string)$xml->Ack;
    
    logDetail("API応答解析", [
        'ack' => $ack,
        'timestamp' => (string)($xml->Timestamp ?? 'N/A')
    ]);
    
    if (in_array($ack, ['Success', 'Warning'])) {
        // 🎉 成功
        
        $end_time_str = (string)($xml->EndTime ?? date('Y-m-d\TH:i:s\Z'));
        
        echo json_encode([
            'success' => true,
            'ebay_item_id' => $ebay_item_id,
            'status' => 'Ended',
            'ended_at' => $end_time_str,
            'reason' => $reason,
            'message' => '✅ 実際のeBay出品が停止されました',
            'permanently_removed' => true,
            'api_method' => 'REAL_EBAY_API_DIRECT',
            'response_time' => $response_time . 'ms',
            'environment' => $ebay_config['environment'],
            'retry_count' => $retry,
            'ack' => $ack
        ]);
        
        logDetail("処理完了 - 成功", [
            'item_id' => $ebay_item_id,
            'end_time' => $end_time_str,
            'total_retries' => $retry
        ]);
        
    } else {
        // ❌ eBay APIエラー
        
        // エラー詳細取得
        $errors = [];
        $errorNodes = $xml->xpath('//ebay:Errors') ?: ($xml->Errors ? [$xml->Errors] : []);
        
        foreach ($errorNodes as $errorNode) {
            $errors[] = [
                'code' => (string)($errorNode->ErrorCode ?? ''),
                'message' => (string)($errorNode->LongMessage ?? $errorNode->ShortMessage ?? ''),
                'severity' => (string)($errorNode->SeverityCode ?? '')
            ];
        }
        
        $error_message = !empty($errors) ? 
            implode(', ', array_column($errors, 'message')) : 
            "eBay API エラー (Ack: {$ack})";
        
        logDetail("eBay APIエラー", [
            'ack' => $ack,
            'errors' => $errors
        ]);
        
        echo json_encode([
            'success' => false,
            'ebay_item_id' => $ebay_item_id,
            'error' => $error_message,
            'ack' => $ack,
            'errors' => $errors,
            'retry_possible' => true,
            'api_method' => 'REAL_EBAY_API_ERROR',
            'response_time' => $response_time . 'ms',
            'retry_count' => $retry
        ]);
    }
    
} catch (Exception $e) {
    // 🚨 システムエラー
    
    logDetail("システム例外", [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'success' => false,
        'ebay_item_id' => $ebay_item_id,
        'error' => "システムエラー: " . $e->getMessage(),
        'system_error' => true,
        'retry_possible' => false,
        'api_method' => 'SYSTEM_ERROR',
        'debug_log' => __DIR__ . '/ebay_api_debug_detailed.log'
    ]);
}

logDetail("=== eBay API詳細デバッグ終了 ===");
?>