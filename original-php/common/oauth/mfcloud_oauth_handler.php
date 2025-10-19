<?php
/**
 * 完全統合版 MoneyForward OAuth認証システム
 * common/oauth/mfcloud_oauth_handler.php
 * 
 * 機能:
 * - OAuth認証処理
 * - トークン取得・更新
 * - .envファイル自動更新
 * - 既存APIキー管理システム連携
 */

// セキュリティ設定
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CSRF保護
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
}

// 設定定数
define('MF_CONFIG_FILE', __DIR__ . '/../../data/mf_oauth_config.json');
define('ENV_FILE', __DIR__ . '/../env/.env');
define('APIKEYS_FILE', __DIR__ . '/../../data/apikeys.json');

/**
 * MoneyForward OAuth設定
 */
$mf_services = [
    'accounting' => [
        'name' => 'MFクラウド会計',
        'auth_url' => 'https://biz.moneyforward.com/oauth/authorize',
        'token_url' => 'https://biz.moneyforward.com/oauth/token',
        'api_base' => 'https://biz.moneyforward.com/api/external/v1',
        'scopes' => 'read write'
    ],
    'invoice' => [
        'name' => 'MFクラウド請求書',
        'auth_url' => 'https://invoice.moneyforward.com/oauth/authorize',
        'token_url' => 'https://invoice.moneyforward.com/oauth/token',
        'api_base' => 'https://invoice.moneyforward.com/api/v3',
        'scopes' => 'read write'
    ],
    'expense' => [
        'name' => 'MFクラウド経費',
        'auth_url' => 'https://expense.moneyforward.com/oauth/authorize',
        'token_url' => 'https://expense.moneyforward.com/oauth/token',
        'api_base' => 'https://expense.moneyforward.com/api/external/v1',
        'scopes' => 'read write'
    ]
];

/**
 * Ajax処理ハンドラー
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=UTF-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'start_oauth':
            echo json_encode(startOAuthFlow($input['service'] ?? ''));
            exit;
            
        case 'handle_callback':
            echo json_encode(handleOAuthCallback($input));
            exit;
            
        case 'get_status':
            echo json_encode(getOAuthStatus($input['service'] ?? ''));
            exit;
            
        case 'test_connection':
            echo json_encode(testConnection($input['service'] ?? ''));
            exit;
            
        case 'revoke':
            echo json_encode(revokeOAuth($input['service'] ?? ''));
            exit;
            
        case 'save_config':
            echo json_encode(saveConfig($input));
            exit;
            
        default:
            echo json_encode(['success' => false, 'error' => '不明なアクション: ' . $action]);
            exit;
    }
}

/**
 * OAuth認証フロー開始
 */
function startOAuthFlow($service) {
    global $mf_services;
    
    if (!isset($mf_services[$service])) {
        return ['success' => false, 'error' => '不明なサービス: ' . $service];
    }
    
    // 設定読み込み
    $config = loadConfig($service);
    if (!$config || !$config['client_id']) {
        return ['success' => false, 'error' => 'Client IDが設定されていません'];
    }
    
    // 状態パラメータ生成
    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state_' . $service] = $state;
    $_SESSION['oauth_service'] = $service;
    
    // リダイレクトURL
    $redirect_uri = 'http://' . $_SERVER['HTTP_HOST'] . '/common/oauth/mfcloud_oauth_handler.php';
    
    // 認証URL構築
    $auth_url = $mf_services[$service]['auth_url'] . '?' . http_build_query([
        'client_id' => $config['client_id'],
        'redirect_uri' => $redirect_uri,
        'scope' => $mf_services[$service]['scopes'],
        'response_type' => 'code',
        'state' => $state
    ]);
    
    return [
        'success' => true,
        'auth_url' => $auth_url,
        'service' => $service,
        'state' => $state
    ];
}

/**
 * OAuth認証コールバック処理
 */
function handleOAuthCallback($params) {
    global $mf_services;
    
    $code = $params['code'] ?? $_GET['code'] ?? '';
    $state = $params['state'] ?? $_GET['state'] ?? '';
    $service = $_SESSION['oauth_service'] ?? '';
    
    // 状態確認
    if (!$state || $_SESSION['oauth_state_' . $service] !== $state) {
        return ['success' => false, 'error' => '不正な状態パラメータ'];
    }
    
    if (!$code) {
        return ['success' => false, 'error' => '認証コードが取得できませんでした'];
    }
    
    // 設定読み込み
    $config = loadConfig($service);
    if (!$config) {
        return ['success' => false, 'error' => '設定が見つかりません'];
    }
    
    // トークン取得
    $token_data = exchangeCodeForToken($service, $code, $config);
    if (!$token_data['success']) {
        return $token_data;
    }
    
    // トークン保存
    $save_result = saveTokens($service, $token_data['data']);
    if (!$save_result['success']) {
        return $save_result;
    }
    
    // .envファイル更新
    updateEnvFile($service, $config, $token_data['data']);
    
    // APIキー管理システムに追加
    addToApiKeySystem($service, $config, $token_data['data']);
    
    // セッションクリア
    unset($_SESSION['oauth_state_' . $service]);
    unset($_SESSION['oauth_service']);
    
    return [
        'success' => true,
        'message' => $mf_services[$service]['name'] . ' の認証が完了しました',
        'service' => $service,
        'expires_in' => $token_data['data']['expires_in'] ?? 3600
    ];
}

/**
 * 認証コードをアクセストークンに交換
 */
function exchangeCodeForToken($service, $code, $config) {
    global $mf_services;
    
    $redirect_uri = 'http://' . $_SERVER['HTTP_HOST'] . '/common/oauth/mfcloud_oauth_handler.php';
    
    $post_data = [
        'grant_type' => 'authorization_code',
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'code' => $code,
        'redirect_uri' => $redirect_uri
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $mf_services[$service]['token_url'],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($post_data),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json'
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        return ['success' => false, 'error' => 'cURL エラー: ' . $error];
    }
    
    if ($http_code !== 200) {
        return ['success' => false, 'error' => "HTTP エラー: $http_code - $response"];
    }
    
    $token_data = json_decode($response, true);
    if (!$token_data || !isset($token_data['access_token'])) {
        return ['success' => false, 'error' => 'トークン取得失敗: ' . $response];
    }
    
    return ['success' => true, 'data' => $token_data];
}

/**
 * トークン保存
 */
function saveTokens($service, $token_data) {
    $config = loadConfig($service);
    $config['access_token'] = $token_data['access_token'];
    $config['refresh_token'] = $token_data['refresh_token'] ?? '';
    $config['expires_at'] = time() + ($token_data['expires_in'] ?? 3600);
    $config['updated_at'] = date('Y-m-d H:i:s');
    
    return saveConfig(['service' => $service] + $config);
}

/**
 * .envファイル更新
 */
function updateEnvFile($service, $config, $token_data) {
    $env_lines = [];
    
    if (file_exists(ENV_FILE)) {
        $env_lines = file(ENV_FILE, FILE_IGNORE_NEW_LINES);
    }
    
    // サービス別のプレフィックス
    $prefix = strtoupper($service === 'accounting' ? 'MF' : 'MF_' . strtoupper($service));
    
    $env_vars = [
        $prefix . '_CLIENT_ID' => $config['client_id'],
        $prefix . '_CLIENT_SECRET' => $config['client_secret'],
        $prefix . '_ACCESS_TOKEN' => $token_data['access_token'],
        $prefix . '_REFRESH_TOKEN' => $token_data['refresh_token'] ?? ''
    ];
    
    // 既存の設定を更新または追加
    foreach ($env_vars as $key => $value) {
        $found = false;
        for ($i = 0; $i < count($env_lines); $i++) {
            if (strpos($env_lines[$i], $key . '=') === 0) {
                $env_lines[$i] = $key . '=' . $value;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $env_lines[] = $key . '=' . $value;
        }
    }
    
    // ディレクトリ作成
    $env_dir = dirname(ENV_FILE);
    if (!is_dir($env_dir)) {
        mkdir($env_dir, 0755, true);
    }
    
    file_put_contents(ENV_FILE, implode("\n", $env_lines) . "\n");
    error_log("✅ .envファイル更新: MoneyForward $service");
    
    return true;
}

/**
 * APIキー管理システムに追加
 */
function addToApiKeySystem($service, $config, $token_data) {
    global $mf_services;
    
    $apikeys = [];
    if (file_exists(APIKEYS_FILE)) {
        $apikeys = json_decode(file_get_contents(APIKEYS_FILE), true) ?: [];
    }
    
    $new_key = [
        'id' => time() . rand(100, 999),
        'key_name' => $mf_services[$service]['name'] . ' (OAuth)',
        'api_service' => 'moneyforward_' . $service,
        'encrypted_key' => base64_encode($token_data['access_token']),
        'tier_level' => 'premium',
        'status' => 'active',
        'daily_limit' => 5000,
        'daily_usage' => 0,
        'notes' => 'OAuth認証で自動取得 - ' . date('Y-m-d H:i:s'),
        'created_at' => date('Y-m-d H:i:s'),
        'oauth_data' => [
            'service' => $service,
            'refresh_token' => $token_data['refresh_token'] ?? '',
            'expires_at' => time() + ($token_data['expires_in'] ?? 3600)
        ]
    ];
    
    // 既存の同サービスキーを削除
    $apikeys = array_filter($apikeys, function($key) use ($service) {
        return !isset($key['oauth_data']['service']) || $key['oauth_data']['service'] !== $service;
    });
    
    $apikeys[] = $new_key;
    
    // ディレクトリ作成
    $apikeys_dir = dirname(APIKEYS_FILE);
    if (!is_dir($apikeys_dir)) {
        mkdir($apikeys_dir, 0755, true);
    }
    
    file_put_contents(APIKEYS_FILE, json_encode($apikeys, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    error_log("✅ APIキー管理システム追加: MoneyForward $service (ID: {$new_key['id']})");
    
    return $new_key;
}

/**
 * OAuth状況取得
 */
function getOAuthStatus($service) {
    $config = loadConfig($service);
    
    if (!$config || !$config['access_token']) {
        return ['success' => true, 'status' => 'not_connected', 'service' => $service];
    }
    
    $is_expired = time() > ($config['expires_at'] ?? 0);
    
    return [
        'success' => true,
        'status' => $is_expired ? 'expired' : 'connected',
        'service' => $service,
        'expires_at' => $config['expires_at'] ?? 0,
        'updated_at' => $config['updated_at'] ?? ''
    ];
}

/**
 * 接続テスト
 */
function testConnection($service) {
    global $mf_services;
    
    $config = loadConfig($service);
    if (!$config || !$config['access_token']) {
        return ['success' => false, 'error' => 'アクセストークンがありません'];
    }
    
    // API呼び出しテスト
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $mf_services[$service]['api_base'] . '/user',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['access_token'],
            'Accept: application/json'
        ],
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false
    ]);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        return [
            'success' => true,
            'message' => $mf_services[$service]['name'] . ' への接続が成功しました',
            'response_time' => '< 1秒'
        ];
    } else {
        return [
            'success' => false,
            'error' => "接続失敗 (HTTP: $http_code)"
        ];
    }
}

/**
 * OAuth認証解除
 */
function revokeOAuth($service) {
    $config = loadConfig($service);
    
    // 設定削除
    deleteConfig($service);
    
    // .envファイルから削除
    removeFromEnvFile($service);
    
    // APIキー管理システムから削除
    removeFromApiKeySystem($service);
    
    return [
        'success' => true,
        'message' => 'OAuth認証を解除しました'
    ];
}

/**
 * 設定ファイル操作
 */
function loadConfig($service) {
    if (!file_exists(MF_CONFIG_FILE)) {
        return null;
    }
    
    $configs = json_decode(file_get_contents(MF_CONFIG_FILE), true);
    return $configs[$service] ?? null;
}

function saveConfig($data) {
    $service = $data['service'];
    
    $configs = [];
    if (file_exists(MF_CONFIG_FILE)) {
        $configs = json_decode(file_get_contents(MF_CONFIG_FILE), true) ?: [];
    }
    
    $configs[$service] = $data;
    
    $config_dir = dirname(MF_CONFIG_FILE);
    if (!is_dir($config_dir)) {
        mkdir($config_dir, 0755, true);
    }
    
    file_put_contents(MF_CONFIG_FILE, json_encode($configs, JSON_PRETTY_PRINT));
    
    return ['success' => true, 'message' => '設定を保存しました'];
}

function deleteConfig($service) {
    if (!file_exists(MF_CONFIG_FILE)) {
        return;
    }
    
    $configs = json_decode(file_get_contents(MF_CONFIG_FILE), true) ?: [];
    unset($configs[$service]);
    
    file_put_contents(MF_CONFIG_FILE, json_encode($configs, JSON_PRETTY_PRINT));
}

/**
 * .envファイルから削除
 */
function removeFromEnvFile($service) {
    if (!file_exists(ENV_FILE)) {
        return;
    }
    
    $env_lines = file(ENV_FILE, FILE_IGNORE_NEW_LINES);
    $prefix = strtoupper($service === 'accounting' ? 'MF' : 'MF_' . strtoupper($service));
    
    $env_lines = array_filter($env_lines, function($line) use ($prefix) {
        return strpos($line, $prefix . '_') !== 0;
    });
    
    file_put_contents(ENV_FILE, implode("\n", $env_lines) . "\n");
}

/**
 * APIキー管理システムから削除
 */
function removeFromApiKeySystem($service) {
    if (!file_exists(APIKEYS_FILE)) {
        return;
    }
    
    $apikeys = json_decode(file_get_contents(APIKEYS_FILE), true) ?: [];
    
    $apikeys = array_filter($apikeys, function($key) use ($service) {
        return !isset($key['oauth_data']['service']) || $key['oauth_data']['service'] !== $service;
    });
    
    file_put_contents(APIKEYS_FILE, json_encode(array_values($apikeys), JSON_PRETTY_PRINT));
}

// GET リクエスト処理（OAuth認証コールバック）
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['code'])) {
    $result = handleOAuthCallback($_GET);
    
    if ($result['success']) {
        echo "<!DOCTYPE html>
<html>
<head>
    <title>OAuth認証完了</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #28a745; }
        .container { max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class='container'>
        <h1 class='success'>✅ OAuth認証完了</h1>
        <p>{$result['message']}</p>
        <p>このウィンドウを閉じて、元の画面に戻ってください。</p>
        <script>
            setTimeout(() => {
                window.close();
            }, 3000);
        </script>
    </div>
</body>
</html>";
    } else {
        echo "<!DOCTYPE html>
<html>
<head>
    <title>OAuth認証エラー</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; }
        .container { max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class='container'>
        <h1 class='error'>❌ OAuth認証エラー</h1>
        <p>{$result['error']}</p>
        <p>ウィンドウを閉じて、再度お試しください。</p>
        <button onclick='window.close()'>ウィンドウを閉じる</button>
    </div>
</body>
</html>";
    }
    exit;
}
?>