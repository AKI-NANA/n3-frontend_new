<?php
/**
 * 02_scraping/config/inventory.php
 * 
 * 在庫管理システム設定ファイル
 * 出品済み商品（08_listing経由）専用設定
 */

return [
    // ===== 基本設定 =====
    'system_name' => '出品済み商品在庫管理システム',
    'version' => '1.0.0',
    'environment' => 'production',
    
    // ===== データベース設定 =====
    'database' => [
        'host' => 'localhost',
        'dbname' => 'nagano3_db',
        'username' => 'postgres',
        'password' => 'Kn240914',
        'charset' => 'utf8',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    ],
    
    // ===== 監視設定 =====
    'monitoring' => [
        // 基本監視間隔
        'default_check_interval_hours' => 2,
        'check_interval_seconds' => 3,  // スクレイピング間隔
        
        // 監視対象条件
        'target_conditions' => [
            'workflow_status' => 'listed',
            'ebay_item_id_required' => true,
            'monitoring_enabled' => true,
            'url_status' => 'active'
        ],
        
        // 価格変動検知設定
        'price_change_threshold' => 0.05,  // 5%変動で記録
        'significant_change_threshold' => 0.2,  // 20%変動でアラート
        
        // URL生存確認設定
        'url_timeout_seconds' => 15,
        'url_retry_count' => 3,
        'url_retry_delay' => 2
    ],
    
    // ===== バッチ処理設定 =====
    'batch_processing' => [
        'batch_size' => 10,  // 一度に処理する商品数
        'batch_delay_seconds' => 5,  // バッチ間待機時間
        'max_execution_time' => 1800,  // 最大実行時間（30分）
        'memory_limit' => '512M',
        
        // 並列処理設定
        'enable_parallel' => false,  // Web版では無効
        'max_workers' => 3
    ],
    
    // ===== ログ設定 =====
    'logging' => [
        'enabled' => true,
        'level' => 'INFO',  // DEBUG, INFO, WARNING, ERROR
        'max_file_size' => 10 * 1024 * 1024,  // 10MB
        'retention_days' => 30,
        
        'files' => [
            'monitoring' => 'logs/inventory/monitoring.log',
            'price_changes' => 'logs/inventory/price_changes.log',
            'errors' => 'logs/inventory/errors.log',
            'cron' => 'logs/inventory/cron.log'
        ]
    ],
    
    // ===== アラート設定 =====
    'alerts' => [
        'enabled' => true,
        
        // アラート条件
        'conditions' => [
            'error_rate_threshold' => 0.1,  // 10%以上エラー
            'price_drop_threshold' => 0.15,  // 15%以上価格下落
            'price_spike_threshold' => 0.3,  // 30%以上価格上昇
            'dead_link_alert' => true
        ],
        
        // 通知設定
        'notification' => [
            'methods' => ['log'],  // 'email', 'slack', 'webhook', 'log'
            
            // メール設定（無効化）
            'email' => [
                'enabled' => false,
                'to' => 'admin@example.com',
                'from' => 'inventory@system.com',
                'subject_prefix' => '[在庫管理アラート]'
            ],
            
            // Slack設定（無効化）
            'slack' => [
                'enabled' => false,
                'webhook_url' => '',
                'channel' => '#inventory-alerts'
            ]
        ]
    ],
    
    // ===== Yahoo Auction設定 =====
    'yahoo' => [
        'base_url' => 'https://page.auctions.yahoo.co.jp',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        
        // スクレイピング設定
        'request_delay' => 3,  // リクエスト間隔（秒）
        'timeout' => 15,
        'retry_count' => 3,
        'concurrent_requests' => 1,  // 同時リクエスト数
        
        // レート制限対策
        'rate_limit' => [
            'requests_per_minute' => 15,
            'requests_per_hour' => 300,
            'backoff_multiplier' => 2
        ]
    ],
    
    // ===== eBay連携設定 =====
    'ebay' => [
        'base_url' => 'https://www.ebay.com',
        'api_enabled' => false,  // Web版では無効
        
        // eBay URL生成設定
        'item_url_template' => 'https://www.ebay.com/itm/{item_id}',
        'seller_url_template' => 'https://www.ebay.com/usr/{seller_id}'
    ],
    
    // ===== 10_zaiko連携設定 =====
    'zaiko_integration' => [
        'enabled' => true,
        'api_base_url' => '../10_zaiko/api/inventory.php',
        
        // 自動同期設定
        'auto_sync' => [
            'enabled' => true,
            'sync_interval_minutes' => 30,
            'sync_on_price_change' => true,
            'sync_on_stock_change' => true
        ],
        
        // データ形式
        'data_format' => 'json',
        'include_metadata' => true
    ],
    
    // ===== レポート設定 =====
    'reporting' => [
        'enabled' => true,
        
        // 日次レポート
        'daily_report' => [
            'enabled' => true,
            'time' => '09:00',  // 毎朝9時
            'format' => 'json',  // json, csv, html
            'save_path' => 'logs/inventory/daily_reports/',
            'retention_days' => 90
        ],
        
        // 週次レポート
        'weekly_report' => [
            'enabled' => true,
            'day' => 'monday',
            'time' => '08:00',
            'include_trends' => true
        ]
    ],
    
    // ===== セキュリティ設定 =====
    'security' => [
        // API認証
        'api_key_required' => false,  // 内部API用に無効
        'rate_limiting' => [
            'enabled' => true,
            'requests_per_minute' => 100,
            'burst_limit' => 20
        ],
        
        // 暗号化
        'encryption' => [
            'enabled' => true,
            'algorithm' => 'AES-256-CBC',
            'key' => 'your-encryption-key-here'  // 本番では環境変数から取得
        ],
        
        // 監査ログ
        'audit_log' => [
            'enabled' => true,
            'sensitive_operations' => true,
            'retention_days' => 180
        ]
    ],
    
    // ===== 開発・デバッグ設定 =====
    'debug' => [
        'enabled' => false,
        'verbose_logging' => false,
        'simulate_mode' => false,  // true時は実際の更新なし
        'log_sql_queries' => false,
        
        // テスト用設定
        'test_product_ids' => [],
        'limit_to_test_products' => false
    ],
    
    // ===== クリーンアップ設定 =====
    'cleanup' => [
        // 古いデータ削除
        'auto_cleanup' => true,
        'stock_history_retention_days' => 90,
        'execution_logs_retention_days' => 30,
        'error_logs_retention_days' => 60,
        
        // データベース最適化
        'auto_optimize' => true,
        'optimize_schedule' => 'weekly'
    ],
    
    // ===== パフォーマンス設定 =====
    'performance' => [
        // キャッシュ設定
        'cache' => [
            'enabled' => true,
            'type' => 'file',  // file, redis, memcached
            'ttl' => 3600,  // 1時間
            'prefix' => 'inventory_'
        ],
        
        // データベース最適化
        'database' => [
            'connection_pool_size' => 10,
            'query_timeout' => 30,
            'use_prepared_statements' => true
        ]
    ],
    
    // ===== 08_listing統合設定 =====
    'listing_integration' => [
        'enabled' => true,
        'auto_register_on_listing' => true,
        'api_endpoint' => '../08_listing/api/listing.php',
        
        // 出品完了フック設定
        'hook_settings' => [
            'timeout' => 10,
            'retry_count' => 2,
            'async_processing' => false
        ]
    ]
];
?>