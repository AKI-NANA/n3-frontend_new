<?php
/**
 * Amazon Product Advertising API (PA-API) 統合設定
 * new_structure/shared/config/amazon_api.php
 * 
 * PA-API v5.0 対応 - 完全版設定ファイル
 */

// 環境設定読み込み関数
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
    // =============================================
    // PA-API 認証設定
    // =============================================
    'credentials' => [
        'access_key' => $env['AMAZON_ACCESS_KEY'] ?? 'YOUR_ACCESS_KEY_HERE',
        'secret_key' => $env['AMAZON_SECRET_KEY'] ?? 'YOUR_SECRET_KEY_HERE',
        'partner_tag' => $env['AMAZON_PARTNER_TAG'] ?? 'YOUR_PARTNER_TAG_HERE', // Associate ID
        'host' => $env['AMAZON_API_HOST'] ?? 'webservices.amazon.com',
        'region' => $env['AMAZON_API_REGION'] ?? 'us-east-1',
    ],

    // =============================================
    // マーケットプレイス設定
    // =============================================
    'marketplaces' => [
        'US' => [
            'host' => 'webservices.amazon.com',
            'region' => 'us-east-1',
            'marketplace_id' => 'ATVPDKIKX0DER',
            'currency' => 'USD',
            'language' => 'en_US'
        ],
        'JP' => [
            'host' => 'webservices.amazon.co.jp',
            'region' => 'us-west-2',
            'marketplace_id' => 'A1VC38T7YXB528',
            'currency' => 'JPY',
            'language' => 'ja_JP'
        ],
        'UK' => [
            'host' => 'webservices.amazon.co.uk',
            'region' => 'eu-west-1',
            'marketplace_id' => 'A1F83G8C2ARO7P',
            'currency' => 'GBP',
            'language' => 'en_GB'
        ],
        'DE' => [
            'host' => 'webservices.amazon.de',
            'region' => 'eu-west-1',
            'marketplace_id' => 'A1PA6795UKMFR9',
            'currency' => 'EUR',
            'language' => 'de_DE'
        ],
        'FR' => [
            'host' => 'webservices.amazon.fr',
            'region' => 'eu-west-1',
            'marketplace_id' => 'A13V1IB3VIYZZH',
            'currency' => 'EUR',
            'language' => 'fr_FR'
        ],
        'IT' => [
            'host' => 'webservices.amazon.it',
            'region' => 'eu-west-1',
            'marketplace_id' => 'APJ6JRA9NG5V4',
            'currency' => 'EUR',
            'language' => 'it_IT'
        ],
        'ES' => [
            'host' => 'webservices.amazon.es',
            'region' => 'eu-west-1',
            'marketplace_id' => 'A1RKKUPIHCS9HS',
            'currency' => 'EUR',
            'language' => 'es_ES'
        ],
        'CA' => [
            'host' => 'webservices.amazon.ca',
            'region' => 'us-east-1',
            'marketplace_id' => 'A2EUQ1WTGCTBG2',
            'currency' => 'CAD',
            'language' => 'en_CA'
        ]
    ],

    // =============================================
    // デフォルト設定
    // =============================================
    'default' => [
        'marketplace' => $env['AMAZON_DEFAULT_MARKETPLACE'] ?? 'US',
        'language' => $env['AMAZON_DEFAULT_LANGUAGE'] ?? 'en_US',
        'currency' => $env['AMAZON_DEFAULT_CURRENCY'] ?? 'USD'
    ],

    // =============================================
    // API エンドポイント・操作設定
    // =============================================
    'operations' => [
        'GetItems' => [
            'path' => '/paapi5/getitems',
            'max_asins' => 10, // 1回のリクエストで最大10ASIN
            'required_params' => ['ItemIds', 'Resources', 'PartnerTag', 'PartnerType', 'Marketplace']
        ],
        'SearchItems' => [
            'path' => '/paapi5/searchitems',
            'max_results' => 50, // 1回のリクエストで最大50件
            'required_params' => ['Keywords', 'Resources', 'PartnerTag', 'PartnerType', 'Marketplace']
        ],
        'GetBrowseNodes' => [
            'path' => '/paapi5/getbrowsenodes',
            'max_nodes' => 10,
            'required_params' => ['BrowseNodeIds', 'Resources', 'PartnerTag', 'PartnerType', 'Marketplace']
        ],
        'GetVariations' => [
            'path' => '/paapi5/getvariations',
            'max_variations' => 10,
            'required_params' => ['ASIN', 'Resources', 'PartnerTag', 'PartnerType', 'Marketplace']
        ]
    ],

    // =============================================
    // データリソース設定（取得するデータ項目）
    // =============================================
    'resources' => [
        // 基本セット（必須データ）
        'basic' => [
            'ItemInfo.Title',
            'Offers.Listings.Price',
            'Offers.Listings.Availability.Message',
            'Images.Primary.Large'
        ],
        
        // 標準セット（推奨）
        'standard' => [
            'ItemInfo.Title',
            'ItemInfo.ByLineInfo',
            'ItemInfo.Features',
            'ItemInfo.ProductInfo',
            'Offers.Listings.Price',
            'Offers.Listings.Availability.Message',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible',
            'Images.Primary.Large',
            'Images.Variants.Large',
            'CustomerReviews.Count',
            'CustomerReviews.StarRating'
        ],
        
        // 完全セット（全データ取得）
        'complete' => [
            // 基本商品情報
            'ItemInfo.Title',
            'ItemInfo.ByLineInfo',
            'ItemInfo.ContentInfo',
            'ItemInfo.ContentRating',
            'ItemInfo.Classifications',
            'ItemInfo.ExternalIds',
            'ItemInfo.Features',
            'ItemInfo.ManufactureInfo',
            'ItemInfo.ProductInfo',
            'ItemInfo.TechnicalInfo',
            'ItemInfo.TradeInInfo',
            
            // 価格・在庫情報
            'Offers.Listings.Price',
            'Offers.Listings.Availability.Message',
            'Offers.Listings.Availability.MaxOrderQuantity',
            'Offers.Listings.Availability.MinOrderQuantity',
            'Offers.Listings.Availability.Type',
            'Offers.Listings.Condition',
            'Offers.Listings.DeliveryInfo.IsAmazonFulfilled',
            'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible',
            'Offers.Listings.DeliveryInfo.ShippingCharges',
            'Offers.Listings.IsBuyBoxWinner',
            'Offers.Listings.LoyaltyPoints.Points',
            'Offers.Listings.MerchantInfo',
            'Offers.Listings.ProgramEligibility.IsPrimeExclusive',
            'Offers.Listings.ProgramEligibility.IsPrimePantry',
            'Offers.Listings.Promotions',
            'Offers.Listings.SavingBasis',
            'Offers.Summaries.HighestPrice',
            'Offers.Summaries.LowestPrice',
            'Offers.Summaries.OfferCount',
            
            // 画像情報
            'Images.Primary.Small',
            'Images.Primary.Medium',
            'Images.Primary.Large',
            'Images.Variants.Small',
            'Images.Variants.Medium',
            'Images.Variants.Large',
            
            // レビュー・評価
            'CustomerReviews.Count',
            'CustomerReviews.StarRating',
            
            // カテゴリ・ランキング
            'BrowseNodeInfo.BrowseNodes',
            'BrowseNodeInfo.WebsiteSalesRank',
            'SalesRank',
            
            // バリエーション情報
            'ParentASIN',
            'VariationSummary.Price.HighestPrice',
            'VariationSummary.Price.LowestPrice',
            'VariationSummary.VariationCount',
            
            // レンタル情報（該当商品のみ）
            'RentalOffers.Listings.Availability.Message',
            'RentalOffers.Listings.BasePrice',
            'RentalOffers.Listings.Condition',
            'RentalOffers.Listings.DeliveryInfo',
            'RentalOffers.Listings.MerchantInfo'
        ],
        
        // カスタマイズセット（効率重視）
        'optimized' => [
            'ItemInfo.Title',
            'ItemInfo.Features',
            'ItemInfo.ProductInfo',
            'ItemInfo.ByLineInfo',
            'Offers.Listings.Price',
            'Offers.Listings.Availability.Message',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible',
            'Images.Primary.Large',
            'Images.Variants.Large',
            'CustomerReviews.Count',
            'CustomerReviews.StarRating',
            'SalesRank',
            'BrowseNodeInfo.BrowseNodes'
        ]
    ],

    // =============================================
    // レート制限・制御設定
    // =============================================
    'rate_limiting' => [
        'requests_per_second' => 1, // 厳密に1秒間1リクエスト
        'max_daily_requests' => 8640, // 1日最大リクエスト数
        'burst_allowance' => 0, // バースト許可なし（安全重視）
        'backoff_strategy' => 'exponential', // 'linear', 'exponential'
        'max_retries' => 3,
        'retry_delay_seconds' => [1, 3, 7], // リトライ間隔
        'circuit_breaker_threshold' => 10, // 連続エラー閾値
        'circuit_breaker_timeout' => 300 // サーキットブレーカー解除時間（秒）
    ],

    // =============================================
    // HTTP/cURL 設定
    // =============================================
    'http' => [
        'timeout' => 30, // 30秒タイムアウト
        'connect_timeout' => 10,
        'user_agent' => 'Amazon-PA-API-Client/1.0 (PHP)',
        'follow_redirects' => true,
        'max_redirects' => 3,
        'verify_ssl' => true,
        'curl_options' => [
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING => 'gzip, deflate',
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2_0
        ]
    ],

    // =============================================
    // キャッシング設定
    // =============================================
    'caching' => [
        'enabled' => true,
        'ttl' => 3600, // 1時間キャッシュ
        'directory' => __DIR__ . '/../../cache/amazon_api/',
        'max_size_mb' => 100,
        'cleanup_interval' => 86400, // 24時間ごとにクリーンアップ
        'compress' => true // gzip圧縮
    ],

    // =============================================
    // ログ設定
    // =============================================
    'logging' => [
        'enabled' => true,
        'level' => $env['AMAZON_LOG_LEVEL'] ?? 'info', // debug, info, warning, error
        'file' => __DIR__ . '/../../logs/amazon_api.log',
        'max_file_size' => 10485760, // 10MB
        'max_files' => 5, // ローテーション
        'format' => '[%datetime%] %level_name%: %message% %context%',
        'include_request_details' => true,
        'include_response_details' => false, // セキュリティ上false推奨
        'log_api_errors' => true,
        'log_rate_limits' => true
    ],

    // =============================================
    // エラーハンドリング設定
    // =============================================
    'error_handling' => [
        'throw_exceptions' => true,
        'log_errors' => true,
        'error_codes' => [
            // 一時的エラー（リトライ可能）
            'retryable' => [
                'TooManyRequests',
                'RequestThrottled',
                'ServiceUnavailable',
                'InternalServerError',
                'Throttling'
            ],
            // 致命的エラー（リトライ不可）
            'fatal' => [
                'InvalidSignature',
                'InvalidAccessKeyId',
                'InvalidParameterValue',
                'MissingParameter',
                'InvalidPartnerTag'
            ],
            // データ関連エラー
            'data_errors' => [
                'ItemNotFound',
                'InvalidItemId',
                'ItemsNotAccessible'
            ]
        ]
    ],

    // =============================================
    // データ処理・変換設定
    // =============================================
    'data_processing' => [
        'auto_convert_prices' => true, // 価格を数値に自動変換
        'extract_image_urls' => true, // 画像URLを配列に抽出
        'parse_dimensions' => true, // サイズ・重量を構造化
        'clean_html_tags' => true, // HTMLタグを除去
        'normalize_availability' => true, // 在庫状況を標準化
        'calculate_savings' => true, // 割引額・率を計算
        'extract_brand' => true, // ブランド情報を抽出
        'parse_features' => true, // 特徴を配列に変換
        'default_currency' => 'USD',
        'price_precision' => 2 // 小数点以下桁数
    ],

    // =============================================
    // バッチ処理設定
    // =============================================
    'batch_processing' => [
        'enabled' => true,
        'batch_size' => 10, // 1バッチあたりのASIN数
        'parallel_batches' => 1, // 同時実行バッチ数（レート制限のため1推奨）
        'delay_between_batches' => 1000, // バッチ間遅延（ミリ秒）
        'max_queue_size' => 1000, // キューの最大サイズ
        'priority_handling' => true, // 優先度処理
        'auto_retry_failed' => true // 失敗したアイテムの自動リトライ
    ],

    // =============================================
    // モニタリング・監視設定
    // =============================================
    'monitoring' => [
        'track_api_usage' => true,
        'track_response_times' => true,
        'track_error_rates' => true,
        'alert_on_rate_limit' => true,
        'alert_on_high_error_rate' => true,
        'error_rate_threshold' => 10, // 10%以上でアラート
        'response_time_threshold' => 5000, // 5秒以上でアラート
        'daily_usage_alert_threshold' => 8000, // 1日8000リクエストでアラート
        'store_metrics_days' => 30, // メトリクス保持期間
        'health_check_interval' => 300 // 5分ごとヘルスチェック
    ],

    // =============================================
    // 通知設定
    // =============================================
    'notifications' => [
        'email_alerts' => [
            'enabled' => $env['AMAZON_EMAIL_ALERTS'] ?? false,
            'smtp_host' => $env['SMTP_HOST'] ?? 'localhost',
            'smtp_port' => $env['SMTP_PORT'] ?? 587,
            'smtp_username' => $env['SMTP_USERNAME'] ?? '',
            'smtp_password' => $env['SMTP_PASSWORD'] ?? '',
            'from_email' => $env['SMTP_FROM_EMAIL'] ?? 'noreply@example.com',
            'to_emails' => explode(',', $env['AMAZON_ALERT_EMAILS'] ?? ''),
            'rate_limit_subject' => '[Amazon API] Rate Limit Alert',
            'error_subject' => '[Amazon API] Error Alert',
            'quota_subject' => '[Amazon API] Daily Quota Alert'
        ],
        'webhook' => [
            'enabled' => $env['AMAZON_WEBHOOK_ENABLED'] ?? false,
            'url' => $env['AMAZON_WEBHOOK_URL'] ?? '',
            'secret' => $env['AMAZON_WEBHOOK_SECRET'] ?? '',
            'timeout' => 10
        ],
        'slack' => [
            'enabled' => $env['AMAZON_SLACK_ENABLED'] ?? false,
            'webhook_url' => $env['AMAZON_SLACK_WEBHOOK'] ?? '',
            'channel' => $env['AMAZON_SLACK_CHANNEL'] ?? '#alerts',
            'username' => 'Amazon API Bot'
        ]
    ],

    // =============================================
    // セキュリティ設定
    // =============================================
    'security' => [
        'encrypt_logs' => false, // ログ暗号化
        'mask_sensitive_data' => true, // ログ内の機密データをマスク
        'ip_whitelist' => [], // 許可IPアドレス（空の場合は制限なし）
        'require_https' => true, // HTTPS必須
        'validate_ssl_certificates' => true,
        'signature_version' => 4, // AWS Signature Version 4
        'request_signing_algorithm' => 'AWS4-HMAC-SHA256'
    ],

    // =============================================
    // デバッグ・開発設定
    // =============================================
    'debug' => [
        'enabled' => $env['AMAZON_DEBUG'] ?? false,
        'log_requests' => false, // セキュリティリスクのためfalse推奨
        'log_responses' => false, // セキュリティリスクのためfalse推奨
        'simulate_api_calls' => false, // テスト用モックAPI
        'mock_data_file' => __DIR__ . '/../../test/mock_amazon_data.json',
        'request_delay_override' => null, // デバッグ用遅延オーバーライド
        'force_error_simulation' => false // エラーテスト用
    ],

    // =============================================
    // パフォーマンス最適化設定
    // =============================================
    'performance' => [
        'connection_pooling' => true,
        'keep_alive' => true,
        'compression' => true,
        'stream_processing' => true, // 大きなレスポンスのストリーム処理
        'memory_limit' => '256M', // メモリ制限
        'gc_probability' => 100, // ガベージコレクション確率
        'optimize_json_parsing' => true,
        'lazy_load_images' => true // 画像URLの遅延読み込み
    ],

    // =============================================
    // データベース統合設定
    // =============================================
    'database' => [
        'auto_save' => true, // 取得データの自動保存
        'update_existing' => true, // 既存データの更新
        'track_changes' => true, // 変更履歴の記録
        'batch_insert' => true, // バッチ挿入の使用
        'transaction_size' => 100, // トランザクションサイズ
        'connection_timeout' => 30,
        'retry_failed_saves' => true,
        'data_validation' => true // 保存前データ検証
    ],

    // =============================================
    // スケジューラ統合設定
    // =============================================
    'scheduler' => [
        'enabled' => true,
        'high_priority_interval' => 1800, // 30分（秒）
        'normal_priority_interval' => 7200, // 2時間（秒）
        'low_priority_interval' => 86400, // 24時間（秒）
        'max_concurrent_jobs' => 1, // レート制限のため1
        'job_timeout' => 3600, // ジョブタイムアウト1時間
        'retry_failed_jobs' => true,
        'cleanup_old_jobs' => true,
        'job_retention_days' => 7
    ],

    // =============================================
    // 地域・言語設定
    // =============================================
    'localization' => [
        'timezone' => $env['AMAZON_TIMEZONE'] ?? 'UTC',
        'date_format' => 'Y-m-d H:i:s',
        'number_format' => [
            'decimal_separator' => '.',
            'thousands_separator' => ',',
            'currency_symbol_position' => 'before' // 'before' or 'after'
        ]
    ],

    // =============================================
    // API バージョン・互換性設定
    // =============================================
    'api_version' => [
        'current' => '5.0',
        'supported' => ['5.0'],
        'auto_upgrade' => false,
        'compatibility_mode' => false,
        'deprecated_warnings' => true
    ],

    // =============================================
    // 拡張・プラグイン設定
    // =============================================
    'extensions' => [
        'data_processors' => [
            'price_converter' => 'AmazonPriceConverter',
            'image_optimizer' => 'AmazonImageOptimizer',
            'text_cleaner' => 'AmazonTextCleaner'
        ],
        'custom_resources' => [], // カスタムリソース定義
        'hooks' => [
            'pre_request' => [], // リクエスト前実行関数
            'post_request' => [], // リクエスト後実行関数
            'data_transform' => [] // データ変換関数
        ]
    ]
];

/**
 * 設定値取得ヘルパー関数
 * 
 * @param string $key ドット記法でのキー（例：'rate_limiting.requests_per_second'）
 * @param mixed $default デフォルト値
 * @return mixed
 */
function getAmazonConfig($key, $default = null) {
    static $config = null;
    
    if ($config === null) {
        $config = require __FILE__;
    }
    
    $keys = explode('.', $key);
    $value = $config;
    
    foreach ($keys as $k) {
        if (is_array($value) && isset($value[$k])) {
            $value = $value[$k];
        } else {
            return $default;
        }
    }
    
    return $value;
}

/**
 * 現在の設定でのマーケットプレイス情報取得
 * 
 * @param string $marketplace マーケットプレイス名（US, JP, UK等）
 * @return array|null
 */
function getMarketplaceConfig($marketplace = null) {
    $config = require __FILE__;
    
    if ($marketplace === null) {
        $marketplace = $config['default']['marketplace'];
    }
    
    return $config['marketplaces'][$marketplace] ?? null;
}

/**
 * 現在のリソースセット取得
 * 
 * @param string $set リソースセット名（basic, standard, complete, optimized）
 * @return array
 */
function getResourceSet($set = 'optimized') {
    $config = require __FILE__;
    return $config['resources'][$set] ?? $config['resources']['basic'];
}

/**
 * レート制限チェック
 * 
 * @return bool
 */
function checkRateLimit() {
    $config = require __FILE__;
    $cacheFile = $config['caching']['directory'] . 'rate_limit_tracker.json';
    
    if (!file_exists($cacheFile)) {
        return true;
    }
    
    $data = json_decode(file_get_contents($cacheFile), true);
    $now = time();
    
    // 1秒間の制限チェック
    if (isset($data['last_request']) && ($now - $data['last_request']) < 1) {
        return false;
    }
    
    // 1日の制限チェック
    $today = date('Y-m-d');
    if (isset($data['daily'][$today]) && 
        $data['daily'][$today] >= $config['rate_limiting']['max_daily_requests']) {
        return false;
    }
    
    return true;
}

/**
 * リクエスト実行記録
 */
function recordRequest() {
    $config = require __FILE__;
    $cacheFile = $config['caching']['directory'] . 'rate_limit_tracker.json';
    
    // ディレクトリ作成
    $dir = dirname($cacheFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $data = [];
    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true) ?: [];
    }
    
    $now = time();
    $today = date('Y-m-d');
    
    $data['last_request'] = $now;
    $data['daily'][$today] = ($data['daily'][$today] ?? 0) + 1;
    
    // 古いデータクリーンアップ（7日前まで保持）
    $cutoff = date('Y-m-d', strtotime('-7 days'));
    foreach ($data['daily'] as $date => $count) {
        if ($date < $cutoff) {
            unset($data['daily'][$date]);
        }
    }
    
    file_put_contents($cacheFile, json_encode($data));
}

?>