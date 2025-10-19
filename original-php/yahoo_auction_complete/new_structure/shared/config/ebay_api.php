<?php
/**
 * eBay API統合設定 - Phase 2 Implementation
 * new_structure/shared/config/ebay_api.php
 */

// 環境設定読み込み
function loadEnvironmentConfig() {
    $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
    $config = [];
    
    if (file_exists($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $config[trim($key)] = trim($value, '"');
        }
    }
    
    return $config;
}

$env = loadEnvironmentConfig();

return [
    // Production設定（本番環境）
    'production' => [
        'app_id' => $env['EBAY_CLIENT_ID'] ?? 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce',
        'dev_id' => $env['EBAY_DEV_ID'] ?? 'a1617738-f3cc-4aca-9164-2ca4fdc64f6d',
        'cert_id' => $env['EBAY_CERT_ID'] ?? 'PRD-7fae13b2cf17-be72-4584-bdd6-4ea4',
        'client_secret' => $env['EBAY_CLIENT_SECRET'] ?? 'PRD-7fae13b2cf17-be72-4584-bdd6-4ea4',
        'user_token' => $env['EBAY_USER_ACCESS_TOKEN'] ?? 'v^1.1#i^1#r^1#p^3#I^3#f^0#t^Ul4xMF8wOkNGMzlEOUNGMTg0N0E1RUEwNzc4NjVFOUE0RDlEQzU3XzFfMSNFXjI2MA==',
        'redirect_uri' => $env['EBAY_REDIRECT_URI'] ?? 'urn:ietf:wg:oauth:2.0:oob',
        'site_id' => 0, // US = 0, UK = 3, Japan = 207
        'marketplace_id' => $env['EBAY_MARKETPLACE_ID'] ?? 'EBAY_US',
    ],

    // Sandbox設定（テスト環境）
    'sandbox' => [
        'app_id' => $env['EBAY_SANDBOX_CLIENT_ID'] ?? 'HIROAKIA-HIROAKIA-SBX-eaffa7ada-61f84ec5',
        'dev_id' => $env['EBAY_DEV_ID'] ?? 'a1617738-f3cc-4aca-9164-2ca4fdc64f6d',
        'cert_id' => $env['EBAY_SANDBOX_CERT_ID'] ?? 'SBX-affa7ada0394-ab17-4a0e-9a04-73e3',
        'client_secret' => $env['EBAY_SANDBOX_CLIENT_SECRET'] ?? 'SBX-affa7ada0394-ab17-4a0e-9a04-73e3',
        'redirect_uri' => 'urn:ietf:wg:oauth:2.0:oob',
        'site_id' => 0,
        'marketplace_id' => 'EBAY_US',
    ],

    // 環境設定
    'environment' => $env['EBAY_ENVIRONMENT'] ?? 'production', // 'production' or 'sandbox'
    'use_real_api' => ($env['EBAY_USE_REAL_API'] ?? 'true') === 'true',

    // APIエンドポイント
    'endpoints' => [
        'production' => [
            'trading' => 'https://api.ebay.com/ws/api.dll',
            'finding' => 'https://svcs.ebay.com/services/search/FindingService/v1',
            'shopping' => 'https://open.api.ebay.com/shopping',
            'merchandising' => 'https://svcs.ebay.com/MerchandisingService',
            'inventory' => 'https://api.ebay.com/sell/inventory/v1',
            'sell_feed' => 'https://api.ebay.com/sell/feed/v1',
        ],
        'sandbox' => [
            'trading' => 'https://api.sandbox.ebay.com/ws/api.dll',
            'finding' => 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1',
            'shopping' => 'https://open.api.sandbox.ebay.com/shopping',
            'merchandising' => 'https://svcs.sandbox.ebay.com/MerchandisingService',
            'inventory' => 'https://api.sandbox.ebay.com/sell/inventory/v1',
            'sell_feed' => 'https://api.sandbox.ebay.com/sell/feed/v1',
        ]
    ],

    // API設定
    'compatibility_level' => 1193,
    'call_timeout' => 30, // seconds
    'max_retries' => 3,

    // ログ設定
    'logging' => [
        'enabled' => true,
        'level' => 'info', // debug, info, warning, error
        'file' => '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/logs/ebay_api.log'
    ],

    // キャッシュ設定
    'cache' => [
        'enabled' => true,
        'directory' => '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/shared/cache',
        'ttl' => 3600 // 1時間
    ],

    // 為替レート設定
    'exchange_rate' => [
        'api_key' => $env['exchange_rate_api_key'] ?? '66664450583bfce72d792561',
        'update_interval' => 3600, // 1時間
        'default_rate' => 150.0 // JPY to USD
    ],

    // カテゴリー同期設定
    'category_sync' => [
        'auto_update' => true,
        'update_interval' => 86400, // 24時間
        'max_categories' => 1000
    ],

    // 手数料設定（デフォルト値）
    'default_fees' => [
        'final_value_fee_percent' => 13.25,
        'final_value_fee_max' => 750.00,
        'paypal_fee_percent' => 2.90,
        'paypal_fee_fixed' => 0.30,
        'insertion_fee' => 0.00,
        'international_fee_percent' => 1.00
    ]
];
?>