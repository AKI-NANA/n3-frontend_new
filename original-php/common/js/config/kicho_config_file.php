<?php
/**
 * 🎯 KICHO記帳ツール設定ファイル - Mac環境対応版
 * 
 * ✅ ローカル開発環境設定
 * ✅ ファイルベース動作優先
 * ✅ PostgreSQL/MySQL無効（最初）
 * 
 * @version 1.0.0-MAC-LOCAL
 */

return [
    // =====================================
    // 🗄️ データベース設定（初期無効）
    // =====================================
    'DB_TYPE' => 'mysql',
    'DB_HOST' => 'localhost',
    'DB_PORT' => '3306',
    'DB_NAME' => 'kicho_db',
    'DB_USER' => 'root',
    'DB_PASS' => '',
    'DB_ENABLED' => false, // 最初は無効
    
    // =====================================
    // 📁 ディレクトリ設定
    // =====================================
    'DATA_DIR' => __DIR__ . '/../data/kicho',
    'CSV_UPLOAD_DIR' => __DIR__ . '/../data/kicho/uploads',
    'BACKUP_DIR' => __DIR__ . '/../data/kicho/backups',
    'LOG_DIR' => __DIR__ . '/../data/kicho/logs',
    
    // =====================================
    // 🤖 AI学習設定（初期無効）
    // =====================================
    'PYTHON_API_URL' => 'http://localhost:5000',
    'AI_LEARNING_ENDPOINT' => '/ai/learn',
    'AI_TIMEOUT' => 30,
    'AI_ENABLED' => false, // 最初は無効
    
    // =====================================
    // 💳 MFクラウド連携設定（初期無効）
    // =====================================
    'ENABLE_MF_INTEGRATION' => false, // 最初は無効
    'MF_API_KEY' => '',
    'MF_SECRET_KEY' => '',
    'MF_TIMEOUT' => 30,
    
    // =====================================
    // 🔧 システム設定
    // =====================================
    'DEBUG_MODE' => true,
    'LOG_LEVEL' => 'DEBUG',
    'MAX_UPLOAD_SIZE' => 50 * 1024 * 1024, // 50MB
    'SESSION_TIMEOUT' => 3600, // 1時間
    
    // =====================================
    // 🔐 セキュリティ設定
    // =====================================
    'CSRF_PROTECTION' => true,
    'RATE_LIMIT_ENABLED' => false, // 開発時は無効
    'ALLOWED_IPS' => ['127.0.0.1', 'localhost'],
    
    // =====================================
    // 📱 UI設定
    // =====================================
    'DEFAULT_THEME' => 'default',
    'AUTO_REFRESH_INTERVAL' => 30,
    'PAGINATION_SIZE' => 20,
    'DATE_FORMAT' => 'Y-m-d',
    'CURRENCY_FORMAT' => 'JPY',
    
    // =====================================
    // 🌐 Mac環境固有設定
    // =====================================
    'MAC_LOG_PATH' => '/usr/local/var/log/php.log',
    'HOMEBREW_PHP' => true,
    'LOCAL_DEVELOPMENT' => true,
    
    // =====================================
    // 📊 統計・レポート設定
    // =====================================
    'STATS_CACHE_DURATION' => 300, // 5分
    'EXPORT_FORMATS' => ['csv', 'json', 'excel'],
    'BACKUP_RETENTION_DAYS' => 30,
    
    // =====================================
    // 🔄 自動化設定
    // =====================================
    'AUTO_BACKUP_ENABLED' => true,
    'AUTO_BACKUP_INTERVAL' => 24, // 24時間
    'AUTO_CLEANUP_ENABLED' => true,
    'CLEANUP_OLD_LOGS_DAYS' => 7,
    
    // =====================================
    // 🎯 機能フラグ
    // =====================================
    'FEATURES' => [
        'ai_learning' => false,
        'mf_integration' => false,
        'csv_upload' => true,
        'auto_refresh' => true,
        'backup_restore' => true,
        'user_settings' => true,
        'statistics' => true,
        'export' => true
    ]
];
?>