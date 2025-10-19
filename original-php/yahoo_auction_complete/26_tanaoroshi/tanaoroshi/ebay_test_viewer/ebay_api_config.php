<?php
/**
 * eBay API設定ファイル
 * 実際のeBay Trading API連携用の設定
 * 
 * 🔐 セキュリティ重要: 本番環境では環境変数を使用してください
 */

// eBay API認証情報（サンドボックス環境）
define('EBAY_API_CONFIG', [
    // サンドボックス環境（テスト用）
    'sandbox' => [
        'api_url' => 'https://api.sandbox.ebay.com/ws/api.dll',
        'dev_id' => 'YOUR_SANDBOX_DEV_ID',
        'app_id' => 'YOUR_SANDBOX_APP_ID', 
        'cert_id' => 'YOUR_SANDBOX_CERT_ID',
        'user_token' => 'YOUR_SANDBOX_USER_TOKEN',
        'site_id' => '0', // 0 = US, 77 = Germany, etc.
        'compatibility_level' => '1193'
    ],
    
    // 本番環境
    'production' => [
        'api_url' => 'https://api.ebay.com/ws/api.dll',
        'dev_id' => 'YOUR_PROD_DEV_ID',
        'app_id' => 'YOUR_PROD_APP_ID',
        'cert_id' => 'YOUR_PROD_CERT_ID', 
        'user_token' => 'YOUR_PROD_USER_TOKEN',
        'site_id' => '0',
        'compatibility_level' => '1193'
    ]
]);

// 現在の環境（開発中はsandbox推奨）
define('EBAY_ENV', 'sandbox');

// eBay終了理由コード
define('EBAY_END_REASONS', [
    'NotAvailable' => 'NotAvailable',
    'CustomCode' => 'CustomCode', 
    'Incorrect' => 'Incorrect',
    'LostOrBroken' => 'LostOrBroken',
    'OtherListingError' => 'OtherListingError',
    'SellToHighestBidder' => 'SellToHighestBidder'
]);

// ログ設定
define('EBAY_API_LOG', true);
define('EBAY_LOG_FILE', __DIR__ . '/ebay_api.log');

/**
 * eBay API認証情報を取得
 */
function getEbayConfig() {
    $config = EBAY_API_CONFIG[EBAY_ENV];
    
    // 環境変数から認証情報を取得（セキュア）
    if (isset($_ENV['EBAY_DEV_ID'])) {
        $config['dev_id'] = $_ENV['EBAY_DEV_ID'];
    }
    if (isset($_ENV['EBAY_APP_ID'])) {
        $config['app_id'] = $_ENV['EBAY_APP_ID'];
    }
    if (isset($_ENV['EBAY_CERT_ID'])) {
        $config['cert_id'] = $_ENV['EBAY_CERT_ID'];
    }
    if (isset($_ENV['EBAY_USER_TOKEN'])) {
        $config['user_token'] = $_ENV['EBAY_USER_TOKEN'];
    }
    
    return $config;
}

/**
 * API認証情報の検証
 */
function validateEbayCredentials() {
    $config = getEbayConfig();
    
    $required_fields = ['dev_id', 'app_id', 'cert_id', 'user_token'];
    
    foreach ($required_fields as $field) {
        if (empty($config[$field]) || strpos($config[$field], 'YOUR_') === 0) {
            return false;
        }
    }
    
    return true;
}

/**
 * eBay APIログ出力
 */
function logEbayAPI($message, $level = 'INFO') {
    if (!EBAY_API_LOG) return;
    
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    
    file_put_contents(EBAY_LOG_FILE, $log_entry, FILE_APPEND | LOCK_EX);
}

// 初期化ログ
logEbayAPI("eBay API設定ファイル読み込み完了 - 環境: " . EBAY_ENV);
?>