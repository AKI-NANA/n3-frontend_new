<?php
/**
 * Amazon PA-API 設定ファイル
 * new_structure/shared/config/amazon_api.php
 */

// 環境設定読み込み
function loadAmazonEnvironmentConfig() {
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

$env = loadAmazonEnvironmentConfig();

return [
    // Amazon PA-API 認証情報
    'credentials' => [
        'access_key' => $env['AMAZON_ACCESS_KEY'] ?? '',
        'secret_key' => $env['AMAZON_SECRET_KEY'] ?? '',
        'partner_tag' => $env['AMAZON_PARTNER_TAG'] ?? '',
        'marketplace' => $env['AMAZON_MARKETPLACE'] ?? 'www.amazon.com'
    ],
    
    // API エンドポイント
    'endpoints' => [
        'paapi' => 'https://webservices.amazon.com/paapi5/getitems',
        'search' => 'https://webservices.amazon.com/paapi5/searchitems',
        'variations' => 'https://webservices.amazon.com/paapi5/getvariations'
    ],
    
    // レート制限設定
    'rate_limits' => [
        'requests_per_second' => 1,
        'max_requests_per_day' => 8640,
        'burst_limit' => 10,
        'retry_max_attempts' => 3
    ],
    
    // バックオフ設定
    'backoff' => [
        'base_wait_time' => 1, // 基本待機時間（秒）
        'max_wait_time' => 60, // 最大待機時間（秒）
        'exponential_base' => 2 // 指数関数的バックオフの基数
    ],
    
    // キャッシュ設定
    'cache' => [
        'enabled' => true,
        'ttl' => 3600, // 1時間
        'directory' => __DIR__ . '/../../cache/amazon',
        'compress' => true
    ],
    
    // ログ設定
    'logging' => [
        'enabled' => true,
        'level' => 'info', // debug, info, warning, error
        'file' => __DIR__ . '/../../logs/amazon_api.log',
        'max_file_size' => 10 * 1024 * 1024, // 10MB
        'rotation' => true
    ],
    
    // モニタリング設定
    'monitoring' => [
        'high_priority_interval' => 1800,  // 30分
        'normal_priority_interval' => 28800, // 8時間
        'price_threshold' => 5.0, // 5%以上の変動で記録
        'stock_change_threshold' => 1 // 在庫変動の最小閾値
    ],
    
    // API リクエスト設定
    'request' => [
        'timeout' => 30,
        'connect_timeout' => 10,
        'user_agent' => 'YahooAmazonIntegrator/1.0',
        'max_items_per_request' => 10 // PA-APIの制限
    ],
    
    // デフォルト検索パラメータ
    'search_defaults' => [
        'search_index' => 'All',
        'item_count' => 10,
        'resources' => [
            'Images.Primary.Medium',
            'Images.Primary.Large',
            'ItemInfo.Title',
            'ItemInfo.Features',
            'ItemInfo.ProductInfo',
            'Offers.Listings.Price',
            'Offers.Listings.Availability',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible'
        ]
    ],
    
    // エラーコード定義
    'error_codes' => [
        'InvalidParameterValue' => 'パラメータ値が無効',
        'MissingParameters' => '必須パラメータが不足',
        'RequestThrottled' => 'リクエスト制限超過',
        'SignatureDoesNotMatch' => '署名が一致しない',
        'ItemsNotAccessible' => '商品にアクセスできない',
        'TooManyRequests' => 'リクエスト数上限超過'
    ],
    
    // マッチング設定
    'matching' => [
        'confidence_threshold' => 0.75,
        'title_weight' => 0.6,
        'brand_weight' => 0.3,
        'price_weight' => 0.1,
        'batch_size' => 50
    ],
    
    // 通知設定
    'notifications' => [
        'stock_out_alert' => true,
        'price_change_alert' => true,
        'api_error_threshold' => 5, // 5回連続エラーで通知
        'email_enabled' => true
    ]
];
?>