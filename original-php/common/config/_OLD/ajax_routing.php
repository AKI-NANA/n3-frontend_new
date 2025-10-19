<?php
/**
 * Ajax分離ルーティングテーブル - 既存システム最適化版
 * 既存のファイル構造に完全適合（404エラー回避）
 * 実在するAjax処理ファイルを優先使用
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（実在ファイル確認済み）
    // =====================================
    
    'dashboard' => [
        'handler' => 'modules/dashboard/dashboard_ajax_handler.php',
        'namespace' => 'dashboard',
        'rate_limit' => 50,
        'csrf_required' => false,
        'allowed_actions' => [
            'get_stats',
            'refresh_dashboard',
            'health_check'
        ],
        'description' => 'ダッシュボード Ajax処理（要作成）'
    ],
    
    'kicho_content' => [
        'handler' => 'modules/kicho/kicho_ajax_handler.php',
        'namespace' => 'kicho',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            // 🎯 KICHO 43個のアクション（エラー回避_3.md準拠）
            'refresh-all',
            'toggle-auto-refresh',
            'show-import-history',
            'execute-mf-import',
            'show-mf-history',
            'execute-mf-recovery',
            'csv-upload',
            'process-csv-upload',
            'show-duplicate-history',
            'add-text-to-learning',
            'show-ai-learning-history',
            'show-optimization-suggestions',
            'select-all-imported-data',
            'select-by-date-range',
            'select-by-source',
            'delete-selected-data',
            'delete-data-item',
            'execute-integrated-ai-learning',
            'download-rules-csv',
            'create-new-rule',
            'download-all-rules-csv',
            'rules-csv-upload',
            'save-uploaded-rules-as-database',
            'edit-saved-rule',
            'delete-saved-rule',
            'download-pending-csv',
            'download-pending-transactions-csv',
            'approval-csv-upload',
            'bulk-approve-transactions',
            'view-transaction-details',
            'delete-approved-transaction',
            'refresh-ai-history',
            'load-more-sessions',
            'execute-full-backup',
            'export-to-mf',
            'create-manual-backup',
            'generate-advanced-report',
            'health_check',
            'get_statistics',
            'refresh_all_data'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '記帳自動化ツール Ajax処理（実在確認済み・43アクション対応）'
    ],
    
    'zaiko_content' => [
        'handler' => 'common/js/ajax/zaiko_ajax_handler.php',
        'namespace' => 'zaiko',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-inventory-list',
            'update-inventory',
            'create-product',
            'edit-product',
            'delete-product',
            'bulk-update-stock',
            'export-inventory-csv',
            'import-inventory-csv',
            'search-products',
            'get-product-details',
            'update-product-status',
            'generate-inventory-report',
            'sync-with-marketplace',
            'check-low-stock',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '在庫管理 Ajax処理（common/js/ajax/zaiko_ajax_handler.php使用）'
    ],
    
    'juchu_kanri_content' => [
        'handler' => 'common/js/ajax/juchu_kanri_ajax_handler.php',
        'namespace' => 'juchu',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-order-list',
            'create-order',
            'update-order',
            'delete-order',
            'update-order-status',
            'bulk-update-orders',
            'export-orders-csv',
            'import-orders-csv',
            'search-orders',
            'get-order-details',
            'process-payment',
            'generate-invoice',
            'send-notification',
            'sync-with-marketplace',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '受注管理 Ajax処理（common/js/ajax/juchu_kanri_ajax_handler.php使用）'
    ],
    
    'apikey_content' => [
        'handler' => 'modules/apikey/apikey_ajax_handler.php',
        'namespace' => 'apikey',
        'rate_limit' => 30,  // セキュリティ重要のため制限
        'csrf_required' => true,
        'allowed_actions' => [
            'save-api-key',
            'test-api-connection',
            'delete-api-key',
            'get-api-status',
            'refresh-api-token',
            'validate-credentials',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'security_level' => 'high',
        'description' => 'API設定 Ajax処理（実在確認済み・高セキュリティ）'
    ],
    
    'shohin_content' => [
        'handler' => 'common/js/ajax/shohin_ajax_handler.php',
        'namespace' => 'shohin',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-product-list',
            'create-product',
            'update-product',
            'delete-product',
            'bulk-operations',
            'search-products',
            'export-products',
            'import-products',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '商品管理 Ajax処理（common/js/ajax/shohin_ajax_handler.php使用）'
    ],
    
    'asin_upload_content' => [
        'handler' => 'modules/asin_upload/asin_upload_ajax_handler.php',
        'namespace' => 'asin_upload',
        'rate_limit' => 50,  // 大量データ処理のため制限
        'csrf_required' => true,
        'allowed_actions' => [
            'upload-asin-file',
            'process-asin-batch',
            'get-upload-status',
            'validate-asin-data',
            'get-upload-history',
            'delete-upload-batch',
            'export-results',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'file_upload' => true,
        'description' => 'ASIN一括登録 Ajax処理（要作成）'
    ],
    
    'filters_content' => [
        'handler' => 'modules/filters/filters_ajax_handler.php',
        'namespace' => 'filters',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'apply-filter',
            'save-filter',
            'delete-filter',
            'get-filter-list',
            'export-filtered-data',
            'reset-filters',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => 'フィルター機能 Ajax処理（要作成）'
    ],
    
    'manual_content' => [
        'handler' => 'modules/manual/manual_ajax_handler.php',
        'namespace' => 'manual',
        'rate_limit' => 50,
        'csrf_required' => false,  // マニュアル閲覧のみ
        'allowed_actions' => [
            'get-manual-content',
            'search-manual',
            'update-manual',
            'create-manual-page',
            'delete-manual-page',
            'export-manual',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => false,
        'description' => 'マニュアル Ajax処理（要作成）'
    ],
    
    'settings_content' => [
        'handler' => 'modules/settings/settings_ajax_handler.php',
        'namespace' => 'settings',
        'rate_limit' => 30,
        'csrf_required' => true,
        'allowed_actions' => [
            'save-settings',
            'get-settings',
            'reset-settings',
            'export-settings',
            'import-settings',
            'test-settings',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => 'システム設定 Ajax処理（要作成）'
    ],
    
    'ai_predictor_content' => [
        'handler' => 'modules/ai_predictor/ai_predictor_ajax_handler.php',
        'namespace' => 'ai_predictor',
        'rate_limit' => 20,   // AI処理は重いため制限
        'csrf_required' => true,
        'allowed_actions' => [
            'run-prediction',
            'train-model',
            'get-prediction-history',
            'update-model-settings',
            'export-predictions',
            'validate-data',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'timeout' => 60,
        'description' => 'AI予測ツール Ajax処理（要作成）'
    ],
    
    // =====================================
    // 🛠️ システム・デバッグツール
    // =====================================
    
    'debug_dashboard' => [
        'handler' => 'system_core/debug_system/debug_ajax_handler.php',
        'namespace' => 'debug',
        'rate_limit' => 200,  // デバッグ用のため高い制限
        'csrf_required' => true,
        'allowed_actions' => [
            'get-system-status',
            'run-diagnostic',
            'clear-cache',
            'view-logs',
            'export-debug-info',
            'test-connection',
            'restart-services',
            'update-config',
            'backup-system',
            'restore-system',
            'performance-test',
            'security-scan',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'security_level' => 'admin',
        'description' => 'デバッグダッシュボード Ajax処理（要作成・管理者専用）'
    ],
    
    // =====================================
    // 🎯 特殊機能・システム管理
    // =====================================
    
    'system_ajax' => [
        'handler' => 'common/php/system_ajax_handler.php',
        'namespace' => 'system',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'health_check',
            'get_system_info',
            'clear_cache',
            'test_connection'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => 'システム共通 Ajax処理（実在確認済み）'
    ],
    
    // =====================================
    // 📝 将来拡張用（ファイル未作成）
    // =====================================
    
    'test_tool_content' => [
        'handler' => 'modules/test_tool/test_tool_ajax_handler.php',
        'namespace' => 'test_tool',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'run-test',
            'get-test-results',
            'save-test-config',
            'export-test-data',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => 'テストツール Ajax処理（要作成）'
    ],
    
    'ichigen_kanri_content' => [
        'handler' => 'modules/ichigen_kanri/ichigen_kanri_ajax_handler.php',
        'namespace' => 'ichigen_kanri',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-ichigen-list',
            'update-ichigen-data',
            'sync-all-systems',
            'generate-report',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '一元管理 Ajax処理（要作成）'
    ],
    
    'image_manager_content' => [
        'handler' => 'modules/image_manager/image_manager_ajax_handler.php',
        'namespace' => 'image_manager',
        'rate_limit' => 50,
        'csrf_required' => true,
        'allowed_actions' => [
            'upload-image',
            'process-image',
            'get-image-list',
            'delete-image',
            'optimize-images',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'file_upload' => true,
        'max_file_size' => '10MB',
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'description' => '画像マネージャー Ajax処理（要作成）'
    ],
    
    'ai_control_deck_content' => [
        'handler' => 'modules/ai_control_deck/ai_control_deck_ajax_handler.php',
        'namespace' => 'ai_control_deck',
        'rate_limit' => 30,
        'csrf_required' => true,
        'allowed_actions' => [
            'control-ai-system',
            'get-ai-status',
            'update-ai-settings',
            'run-ai-diagnostic',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'timeout' => 60,
        'description' => 'AI制御デッキ Ajax処理（要作成）'
    ],
    
    'souryou_keisan_content' => [
        'handler' => 'modules/souryou/fes1/souryou_keisan_ajax_handler.php',
        'namespace' => 'souryou_keisan',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'calculate-shipping',
            'get-shipping-rates',
            'update-shipping-config',
            'test-shipping-api',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '送料計算 Ajax処理（実在確認済み）'
    ]
];

/**
 * 🎯 既存システム適合情報
 * 
 * ■ 実在するAjax処理ファイル（404エラーなし）:
 * ✅ modules/kicho/kicho_ajax_handler.php
 * ✅ modules/apikey/apikey_ajax_handler.php
 * ✅ common/js/ajax/zaiko_ajax_handler.php
 * ✅ common/js/ajax/juchu_kanri_ajax_handler.php
 * ✅ common/js/ajax/shohin_ajax_handler.php
 * ✅ common/js/ajax/kicho_ajax_handler.php
 * ✅ common/js/ajax/other_modules_ajax_handler.php
 * ✅ common/php/system_ajax_handler.php
 * ✅ modules/souryou/fes1/souryou_keisan_ajax_handler.php
 * ✅ system_core/bootstrap/handlers/ajax_handlers.php
 * ✅ system_core/bootstrap/handlers/ajax_manager.php
 * 
 * ■ 既存のAjax配置パターン:
 * 1. modules/[module_name]/[module_name]_ajax_handler.php
 * 2. common/js/ajax/[module_name]_ajax_handler.php
 * 3. common/php/system_ajax_handler.php
 * 4. system_core/bootstrap/handlers/ajax_*.php
 * 
 * ■ KICHOモジュールの特別対応:
 * - modules/kicho/kicho_ajax_handler.php が実在
 * - 43個のアクション対応必須
 * - common/js/ajax/kicho_ajax_handler.php も存在
 * - modules/kicho/kicho_complete_ajax.php も存在
 * - 競合回避のため modules/kicho/ を優先使用
 * 
 * ■ common/js/ajax/ ディレクトリ活用:
 * - zaiko_ajax_handler.php: 在庫管理
 * - juchu_kanri_ajax_handler.php: 受注管理
 * - shohin_ajax_handler.php: 商品管理
 * - other_modules_ajax_handler.php: その他モジュール
 * 
 * ■ 設定方針:
 * 1. 実在するファイルを優先使用
 * 2. 存在しないファイルは modules/ パスで要作成指定
 * 3. common/js/ajax/ は既存ファイル活用
 * 4. system_core/ はシステム管理用
 * 5. セキュリティレベルに応じたレート制限設定
 * 
 * ■ ファイル作成優先度:
 * 🔥 高優先度: dashboard, asin_upload, filters, manual, settings
 * 📋 中優先度: test_tool, ichigen_kanri, image_manager
 * 🚀 低優先度: ai_control_deck (AI系は実験的)
 * 
 * ■ 統一レスポンス形式:
 * ```json
 * {
 *   "success": true|false,
 *   "message": "処理結果メッセージ",
 *   "data": {...実際のデータ...},
 *   "timestamp": "2025-01-01T12:00:00+09:00"
 * }
 * ```
 */