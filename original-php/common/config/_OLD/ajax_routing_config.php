<?php
/**
 * Ajax分離ルーティングテーブル
 * NAGANO3 3分離ルーティングシステム
 * 
 * 🎯 目的: Ajax処理の完全外部化管理
 * ✅ 新ツール追加時：1行追加のみ
 * ✅ index.php肥大化完全回避
 * ✅ セキュリティ強化（CSRF・レート制限）
 * ✅ 統一レスポンス形式
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（既存）
    // =====================================
    
    'dashboard' => [
        'handler' => 'modules/dashboard/dashboard_ajax_handler.php',
        'namespace' => 'dashboard',
        'rate_limit' => 50,
        'csrf_required' => false,  // 基本表示のみ
        'allowed_actions' => [
            'get_stats',
            'refresh_dashboard',
            'health_check'
        ],
        'description' => 'ダッシュボード Ajax処理'
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
        'description' => '記帳自動化ツール Ajax処理（43アクション対応）'
    ],
    
    'zaiko_content' => [
        'handler' => 'modules/zaiko/zaiko_ajax_handler.php',
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
        'description' => '在庫管理 Ajax処理'
    ],
    
    'juchu_kanri_content' => [
        'handler' => 'modules/juchu_kanri/juchu_kanri_ajax_handler.php',
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
        'description' => '受注管理 Ajax処理'
    ],
    
    'shohin_content' => [
        'handler' => 'modules/shohin/shohin_ajax_handler.php',
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
        'description' => '商品管理 Ajax処理'
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
        'description' => 'ASIN一括登録 Ajax処理'
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
        'description' => 'API設定 Ajax処理（高セキュリティ）'
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
        'description' => 'システム設定 Ajax処理'
    ],
    
    'toiawase_kanri_content' => [
        'handler' => 'modules/toiawase_kanri/toiawase_kanri_ajax_handler.php',
        'namespace' => 'toiawase_kanri',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-inquiry-list',
            'create-inquiry',
            'update-inquiry',
            'delete-inquiry',
            'update-inquiry-status',
            'send-response',
            'bulk-operations',
            'search-inquiries',
            'export-inquiries',
            'get-inquiry-details',
            'add-note',
            'assign-staff',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '問い合わせ管理 Ajax処理'
    ],
    
    'shukka_kanri_content' => [
        'handler' => 'modules/shukka_kanri/shukka_kanri_ajax_handler.php',
        'namespace' => 'shukka_kanri',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'get-shipment-list',
            'create-shipment',
            'update-shipment',
            'delete-shipment',
            'update-shipment-status',
            'bulk-ship',
            'print-labels',
            'track-shipments',
            'export-shipments',
            'get-shipment-details',
            'calculate-shipping',
            'validate-address',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '出荷管理 Ajax処理'
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
        'description' => 'デバッグダッシュボード Ajax処理（管理者専用）'
    ],
    
    // =====================================
    // 🎯 追加ツール（将来拡張用）
    // =====================================
    
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
        'timeout' => 60,  // AI処理用のタイムアウト延長
        'description' => 'AI予測ツール Ajax処理（処理時間延長）'
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
        'error_logging' => false,  // 軽い処理のためログ簡素化
        'description' => 'マニュアル Ajax処理'
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
        'description' => 'フィルター機能 Ajax処理'
    ],
    
    'ebay_kicho_content' => [
        'handler' => 'modules/ebay_kicho/ebay_kicho_ajax_handler.php',
        'namespace' => 'ebay_kicho',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            // eBay特化版KICHOアクション
            'import-ebay-transactions',
            'sync-ebay-data',
            'process-ebay-fees',
            'generate-ebay-report',
            'export-to-accounting',
            'validate-ebay-data',
            'auto-categorize',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'external_api' => 'ebay',
        'description' => 'eBay記帳ツール Ajax処理'
    ],
    
    'modules_keyword_research_content' => [
        'handler' => 'modules/keyword_research/keyword_research_ajax_handler.php',
        'namespace' => 'keyword_research',
        'rate_limit' => 30,   // 外部API使用のため制限
        'csrf_required' => true,
        'allowed_actions' => [
            'search-keywords',
            'analyze-competition',
            'get-search-volume',
            'export-keyword-data',
            'save-keyword-list',
            'delete-keyword-list',
            'update-keyword-status',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'external_api' => 'keyword_tools',
        'timeout' => 30,
        'description' => 'キーワードリサーチ Ajax処理（外部API連携）'
    ],
    
    // =====================================
    // 🎨 特殊ページ・カスタムツール
    // =====================================
    
    'temp_existing_content' => [
        'handler' => 'modules/temp/temp_ajax_handler.php',
        'namespace' => 'temp',
        'rate_limit' => 50,
        'csrf_required' => false,
        'allowed_actions' => [
            'legacy-action',
            'health_check'
        ],
        'response_format' => 'legacy',  // 旧形式レスポンス
        'error_logging' => false,
        'description' => '一時的既存処理（レガシー互換）'
    ],
    
    // =====================================
    // 📝 新ツール追加テンプレート
    // =====================================
    
    /*
    // 基本ツール追加例
    'new_tool_content' => [
        'handler' => 'modules/new_tool/new_tool_ajax_handler.php',
        'namespace' => 'new_tool',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'main-action',
            'secondary-action',
            'health_check'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'description' => '新ツール Ajax処理'
    ],
    
    // 高セキュリティツール例
    'secure_tool_content' => [
        'handler' => 'modules/secure_tool/secure_tool_ajax_handler.php',
        'namespace' => 'secure_tool',
        'rate_limit' => 20,
        'csrf_required' => true,
        'allowed_actions' => [
            'secure-action'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'security_level' => 'high',
        'two_factor_required' => true,
        'audit_logging' => true,
        'description' => '高セキュリティツール Ajax処理'
    ],
    
    // ファイルアップロード対応例
    'upload_tool_content' => [
        'handler' => 'modules/upload_tool/upload_tool_ajax_handler.php',
        'namespace' => 'upload_tool',
        'rate_limit' => 10,
        'csrf_required' => true,
        'allowed_actions' => [
            'upload-file',
            'process-upload',
            'get-upload-status'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'file_upload' => true,
        'max_file_size' => '10MB',
        'allowed_extensions' => ['csv', 'xlsx', 'txt'],
        'description' => 'ファイルアップロードツール Ajax処理'
    ],
    
    // 外部API連携例
    'api_integration_content' => [
        'handler' => 'modules/api_integration/api_integration_ajax_handler.php',
        'namespace' => 'api_integration',
        'rate_limit' => 50,
        'csrf_required' => true,
        'allowed_actions' => [
            'sync-with-api',
            'test-api-connection',
            'import-api-data'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'external_api' => 'third_party_service',
        'timeout' => 30,
        'retry_attempts' => 3,
        'description' => '外部API連携ツール Ajax処理'
    ],
    
    // 条件付きアクセス例
    'premium_tool_content' => [
        'handler' => 'modules/premium_tool/premium_tool_ajax_handler.php',
        'namespace' => 'premium_tool',
        'rate_limit' => 100,
        'csrf_required' => true,
        'allowed_actions' => [
            'premium-action'
        ],
        'response_format' => 'unified',
        'error_logging' => true,
        'access_condition' => function() {
            return isset($_SESSION['premium_user']) && $_SESSION['premium_user'] === true;
        },
        'description' => 'プレミアムツール Ajax処理（条件付きアクセス）'
    ],
    */
];

/**
 * 🎯 Ajax ルーティング設定ガイド
 * 
 * ■ 設定項目説明:
 * 
 * 'handler' (string, required)
 *   - Ajax処理ファイルのパス（ドキュメントルートからの相対パス）
 *   - 例: 'modules/tool_name/tool_name_ajax_handler.php'
 * 
 * 'namespace' (string, required)
 *   - Ajax処理の名前空間
 *   - エラーログ・レート制限の識別に使用
 * 
 * 'rate_limit' (int, optional, default: 100)
 *   - 分間リクエスト制限数
 *   - 軽い処理: 200+, 標準: 100, 重い処理: 50, セキュリティ重要: 30以下
 * 
 * 'csrf_required' (bool, optional, default: true)
 *   - CSRF保護の要否
 *   - データ変更系: true, 参照系: false
 * 
 * 'allowed_actions' (array, required)
 *   - 処理可能なアクション一覧
 *   - セキュリティ・デバッグ用の明示的制限
 * 
 * 'response_format' (string, optional, default: 'unified')
 *   - unified: 統一JSON形式 {success, message, data, timestamp}
 *   - legacy: 旧形式（互換性用）
 *   - custom: カスタム形式
 * 
 * 'error_logging' (bool, optional, default: true)
 *   - エラーログ出力の要否
 *   - 本番環境では基本的にtrue
 * 
 * 'security_level' (string, optional, default: 'standard')
 *   - standard: 標準セキュリティ
 *   - high: 高セキュリティ（API設定等）
 *   - admin: 管理者専用
 * 
 * 'file_upload' (bool, optional, default: false)
 *   - ファイルアップロード機能の要否
 * 
 * 'max_file_size' (string, optional)
 *   - アップロード最大ファイルサイズ
 *   - 例: '10MB', '500KB'
 * 
 * 'allowed_extensions' (array, optional)
 *   - 許可ファイル拡張子
 *   - 例: ['csv', 'xlsx', 'pdf']
 * 
 * 'external_api' (string, optional)
 *   - 外部API連携の識別子
 *   - 例: 'ebay', 'amazon', 'google'
 * 
 * 'timeout' (int, optional, default: 30)
 *   - 処理タイムアウト秒数
 *   - AI処理・外部API: 60+, 標準: 30
 * 
 * 'retry_attempts' (int, optional, default: 0)
 *   - 失敗時のリトライ回数
 *   - 外部API連携時に有効
 * 
 * 'two_factor_required' (bool, optional, default: false)
 *   - 二要素認証の要否
 *   - 高セキュリティ操作用
 * 
 * 'audit_logging' (bool, optional, default: false)
 *   - 監査ログの要否
 *   - セキュリティ重要操作用
 * 
 * 'access_condition' (callable, optional)
 *   - アクセス条件関数
 *   - trueを返す場合のみ処理実行
 * 
 * 'description' (string, optional)
 *   - Ajax設定の説明（ドキュメント用）
 * 
 * ■ 統一レスポンス形式:
 * ```json
 * {
 *   "success": true|false,
 *   "message": "処理結果メッセージ",
 *   "data": {...実際のデータ...},
 *   "timestamp": "2025-01-01T12:00:00+09:00",
 *   "action": "実行されたアクション",
 *   "namespace": "処理名前空間"
 * }
 * ```
 * 
 * ■ エラーレスポンス形式:
 * ```json
 * {
 *   "success": false,
 *   "error": "エラーメッセージ",
 *   "error_id": "err_xxxxxxxxxx",
 *   "timestamp": "2025-01-01T12:00:00+09:00",
 *   "action": "失敗したアクション",
 *   "namespace": "処理名前空間"
 * }
 * ```
 * 
 * ■ セキュリティ要件:
 * 1. CSRF保護: データ変更系は必須
 * 2. レート制限: 悪用防止
 * 3. パストラバーサル防止: realpath()チェック
 * 4. 入力検証: allowed_actionsによる制限
 * 5. エラーログ: セキュリティインシデント追跡
 * 
 * ■ パフォーマンス最適化:
 * 1. ファイル存在キャッシュ: 5分間
 * 2. レート制限キャッシュ: 1分間
 * 3. 処理タイムアウト: 重い処理の適切な制限
 * 4. エラーログ最適化: 必要な場合のみ出力
 * 
 * ■ 新ツール追加手順:
 * 1. 上記配列に新しいエントリを追加
 * 2. modules/tool_name/tool_name_ajax_handler.php を作成
 * 3. allowed_actionsに処理可能アクションを定義
 * 4. セキュリティレベルに応じて設定調整
 * 5. 完了（index.php修正不要）
 * 
 * ■ ツール種別別推奨設定:
 * 
 * データ管理系:
 *   - rate_limit: 100
 *   - csrf_required: true
 *   - error_logging: true
 * 
 * API設定系:
 *   - rate_limit: 30
 *   - security_level: 'high'
 *   - audit_logging: true
 * 
 * ファイル処理系:
 *   - rate_limit: 50
 *   - file_upload: true
 *   - timeout: 60
 * 
 * 外部API連携系:
 *   - rate_limit: 30
 *   - timeout: 30
 *   - retry_attempts: 3
 * 
 * AI・重い処理系:
 *   - rate_limit: 20
 *   - timeout: 60
 * 
 * 参照・軽い処理系:
 *   - rate_limit: 200
 *   - csrf_required: false
 *   - error_logging: false
 */