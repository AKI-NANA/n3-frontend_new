<?php
/**
 * NAGANO-3 eBay API設定ファイル
 * 
 * セキュリティ: 本番環境では環境変数使用推奨
 * 暗号化: APIキー・シークレットの暗号化対応
 * マルチアカウント: 複数eBayアカウント管理
 */

// 環境変数から設定読み込み（本番環境推奨）
$client_id = $_ENV['EBAY_CLIENT_ID'] ?? 'your_ebay_client_id';
$client_secret = $_ENV['EBAY_CLIENT_SECRET'] ?? 'your_ebay_client_secret';
$environment = $_ENV['EBAY_ENVIRONMENT'] ?? 'sandbox'; // 'sandbox' or 'production'

return [
    // 基本API設定
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'redirect_uri' => 'https://your-domain.com/auth/ebay/callback',
    'environment' => $environment,
    
    // API エンドポイント設定
    'endpoints' => [
        'sandbox' => [
            'api_base' => 'https://api.sandbox.ebay.com',
            'auth_base' => 'https://auth.sandbox.ebay.com',
            'web_base' => 'https://www.sandbox.ebay.com'
        ],
        'production' => [
            'api_base' => 'https://api.ebay.com',
            'auth_base' => 'https://auth.ebay.com',
            'web_base' => 'https://www.ebay.com'
        ]
    ],
    
    // API バージョン設定
    'api_versions' => [
        'sell_fulfillment' => 'v1',
        'sell_inventory' => 'v1',
        'sell_marketing' => 'v1',
        'buy_order' => 'v2',
        'commerce_taxonomy' => 'v1'
    ],
    
    // OAuth スコープ設定
    'oauth_scopes' => [
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
        'https://api.ebay.com/oauth/api_scope/buy.order.readonly'
    ],
    
    // マルチアカウント設定
    'accounts' => [
        'ebay_jp_main' => [
            'name' => 'eBay Japan Main Account',
            'marketplace_id' => 'EBAY_JP',
            'country_code' => 'JP',
            'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo',
            'refresh_token' => $_ENV['EBAY_JP_MAIN_REFRESH_TOKEN'] ?? '',
            'active' => true,
            'rate_limits' => [
                'calls_per_second' => 5,
                'calls_per_hour' => 5000,
                'calls_per_day' => 100000
            ],
            'notification_settings' => [
                'new_orders' => true,
                'payment_received' => true,
                'shipping_required' => true,
                'disputes' => true
            ]
        ],
        
        'ebay_us_sub' => [
            'name' => 'eBay US Sub Account',
            'marketplace_id' => 'EBAY_US',
            'country_code' => 'US',
            'currency' => 'USD',
            'timezone' => 'America/Los_Angeles',
            'refresh_token' => $_ENV['EBAY_US_SUB_REFRESH_TOKEN'] ?? '',
            'active' => true,
            'rate_limits' => [
                'calls_per_second' => 5,
                'calls_per_hour' => 5000,
                'calls_per_day' => 100000
            ],
            'notification_settings' => [
                'new_orders' => true,
                'payment_received' => false,
                'shipping_required' => true,
                'disputes' => true
            ]
        ],
        
        'ebay_eu_001' => [
            'name' => 'eBay EU Account 001',
            'marketplace_id' => 'EBAY_DE',
            'country_code' => 'DE',
            'currency' => 'EUR',
            'timezone' => 'Europe/Berlin',
            'refresh_token' => $_ENV['EBAY_EU_001_REFRESH_TOKEN'] ?? '',
            'active' => false, // 無効化可能
            'rate_limits' => [
                'calls_per_second' => 3,
                'calls_per_hour' => 3000,
                'calls_per_day' => 50000
            ],
            'notification_settings' => [
                'new_orders' => true,
                'payment_received' => true,
                'shipping_required' => true,
                'disputes' => true
            ]
        ]
    ],
    
    // レート制限設定
    'rate_limiting' => [
        'enabled' => true,
        'default_limits' => [
            'calls_per_second' => 5,
            'calls_per_minute' => 200,
            'calls_per_hour' => 5000,
            'calls_per_day' => 100000
        ],
        'burst_allowance' => 10,
        'cooldown_period' => 60, // 秒
        'retry_attempts' => 3,
        'backoff_multiplier' => 2
    ],
    
    // キャッシュ設定
    'cache' => [
        'enabled' => true,
        'default_ttl' => 300, // 5分
        'order_data_ttl' => 180, // 3分
        'item_data_ttl' => 1800, // 30分
        'auth_token_ttl' => 3300, // 55分（1時間-5分のマージン）
        'max_cache_size' => '100MB',
        'cleanup_interval' => 3600 // 1時間
    ],
    
    // エラーハンドリング設定
    'error_handling' => [
        'max_retry_attempts' => 3,
        'retry_delay_base' => 1, // 秒
        'retry_delay_max' => 60, // 秒
        'log_all_errors' => true,
        'log_level' => 'error', // debug, info, warning, error, critical
        'notification_on_critical' => true,
        'fallback_to_cache' => true,
        'fallback_cache_max_age' => 3600 // 1時間
    ],
    
    // 通知設定
    'notifications' => [
        'enabled' => true,
        'channels' => [
            'email' => [
                'enabled' => true,
                'recipients' => ['admin@your-domain.com'],
                'smtp_config' => [
                    'host' => $_ENV['SMTP_HOST'] ?? 'localhost',
                    'port' => $_ENV['SMTP_PORT'] ?? 587,
                    'username' => $_ENV['SMTP_USERNAME'] ?? '',
                    'password' => $_ENV['SMTP_PASSWORD'] ?? '',
                    'encryption' => 'tls'
                ]
            ],
            'slack' => [
                'enabled' => false,
                'webhook_url' => $_ENV['SLACK_WEBHOOK_URL'] ?? '',
                'channel' => '#ebay-notifications'
            ],
            'webhook' => [
                'enabled' => false,
                'url' => $_ENV['NOTIFICATION_WEBHOOK_URL'] ?? '',
                'secret' => $_ENV['NOTIFICATION_WEBHOOK_SECRET'] ?? ''
            ]
        ],
        'events' => [
            'api_error' => ['email', 'slack'],
            'rate_limit_exceeded' => ['email'],
            'auth_token_expired' => ['email'],
            'new_order' => ['webhook'],
            'payment_received' => ['webhook'],
            'dispute_opened' => ['email', 'slack']
        ]
    ],
    
    // セキュリティ設定
    'security' => [
        'encrypt_stored_tokens' => true,
        'encryption_key' => $_ENV['EBAY_ENCRYPTION_KEY'] ?? 'your-encryption-key',
        'token_rotation_interval' => 86400, // 24時間
        'ip_whitelist' => [
            '127.0.0.1',
            '::1'
            // 本番環境では実際のIPアドレスを設定
        ],
        'require_https' => true,
        'session_security' => [
            'secure_cookies' => true,
            'httponly_cookies' => true,
            'samesite_strict' => true
        ]
    ],
    
    // ログ設定
    'logging' => [
        'enabled' => true,
        'log_file' => '../../../logs/ebay_api.log',
        'max_log_size' => '50MB',
        'log_rotation' => true,
        'retention_days' => 30,
        'log_levels' => [
            'api_requests' => 'info',
            'api_responses' => 'debug',
            'errors' => 'error',
            'auth_events' => 'info',
            'rate_limits' => 'warning'
        ]
    ],
    
    // パフォーマンス設定
    'performance' => [
        'connection_timeout' => 10, // 秒
        'request_timeout' => 30, // 秒
        'max_concurrent_requests' => 10,
        'keep_alive' => true,
        'compression' => true,
        'user_agent' => 'NAGANO-3-eBay-Integration/2.0',
        'parallel_processing' => [
            'enabled' => true,
            'max_workers' => 5,
            'batch_size' => 50
        ]
    ],
    
    // データベース設定（ローカルデータ保存用）
    'database' => [
        'enabled' => true,
        'connection' => [
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'port' => $_ENV['DB_PORT'] ?? 3306,
            'database' => $_ENV['DB_NAME'] ?? 'nagano3_ebay',
            'username' => $_ENV['DB_USERNAME'] ?? 'root',
            'password' => $_ENV['DB_PASSWORD'] ?? '',
            'charset' => 'utf8mb4',
            'options' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        ],
        'tables' => [
            'orders' => 'ebay_orders',
            'order_items' => 'ebay_order_items',
            'auth_tokens' => 'ebay_auth_tokens',
            'api_logs' => 'ebay_api_logs',
            'rate_limits' => 'ebay_rate_limits'
        ]
    ],
    
    // 開発・デバッグ設定
    'development' => [
        'debug_mode' => $_ENV['EBAY_DEBUG'] ?? false,
        'mock_api_responses' => false,
        'log_all_requests' => false,
        'simulate_rate_limits' => false,
        'test_accounts' => [
            'sandbox_buyer' => [
                'username' => 'test_buyer_sandbox',
                'password' => 'test_password'
            ]
        ]
    ],
    
    // 自動同期設定
    'sync_settings' => [
        'auto_sync_enabled' => true,
        'sync_intervals' => [
            'orders' => 300, // 5分
            'inventory' => 1800, // 30分
            'tracking' => 600, // 10分
            'disputes' => 3600 // 1時間
        ],
        'sync_batch_size' => 100,
        'sync_timeout' => 120, // 2分
        'conflict_resolution' => 'ebay_wins', // 'ebay_wins' or 'local_wins'
        'sync_on_startup' => true
    ],
    
    // Webhook設定（eBayからの通知受信）
    'webhooks' => [
        'enabled' => true,
        'endpoint_url' => 'https://your-domain.com/webhooks/ebay',
        'verification_token' => $_ENV['EBAY_WEBHOOK_TOKEN'] ?? 'your-webhook-verification-token',
        'supported_events' => [
            'order.created',
            'order.paid',
            'order.shipped',
            'order.cancelled',
            'dispute.opened',
            'dispute.closed',
            'return.requested'
        ],
        'retry_failed_events' => true,
        'max_retry_attempts' => 5
    ],
    
    // 国際化設定
    'localization' => [
        'default_locale' => 'ja_JP',
        'supported_locales' => ['ja_JP', 'en_US', 'de_DE'],
        'timezone_mapping' => [
            'EBAY_JP' => 'Asia/Tokyo',
            'EBAY_US' => 'America/Los_Angeles',
            'EBAY_DE' => 'Europe/Berlin',
            'EBAY_UK' => 'Europe/London',
            'EBAY_AU' => 'Australia/Sydney'
        ],
        'currency_mapping' => [
            'EBAY_JP' => 'JPY',
            'EBAY_US' => 'USD',
            'EBAY_DE' => 'EUR',
            'EBAY_UK' => 'GBP',
            'EBAY_AU' => 'AUD'
        ]
    ],
    
    // API機能フラグ（機能の有効/無効切り替え）
    'feature_flags' => [
        'order_management' => true,
        'inventory_sync' => true,
        'tracking_updates' => true,
        'automated_shipping' => false,
        'bulk_operations' => true,
        'advanced_analytics' => true,
        'dispute_management' => false,
        'return_management' => false,
        'promotional_offers' => false,
        'cross_border_trade' => true
    ]
];
?>