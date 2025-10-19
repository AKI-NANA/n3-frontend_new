<?php
/**
 * JavaScript分離ルーティングテーブル - 既存システム最適化版
 * 既存のファイル構造に完全適合（404エラー回避）
 * JavaScript競合回避システム統合
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（実在ファイル確認済み）
    // =====================================
    
    'dashboard' => [
        'file' => 'common/js/pages/dashboard.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'dashboard',
        'description' => 'ダッシュボード専用JavaScript（要作成）'
    ],
    
    'kicho_content' => [
        'file' => 'common/js/pages/kicho.js',
        'priority' => 15,  // 高優先度（競合回避のため）
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'kicho',
        'capture_mode' => true,  // useCapture=true
        'actions' => [
            'refresh-all', 'toggle-auto-refresh', 'show-import-history',
            'execute-mf-import', 'show-mf-history', 'execute-mf-recovery',
            'csv-upload', 'process-csv-upload', 'show-duplicate-history',
            'add-text-to-learning', 'show-ai-learning-history',
            'show-optimization-suggestions', 'select-all-imported-data',
            'select-by-date-range', 'select-by-source', 'delete-selected-data',
            'delete-data-item', 'execute-integrated-ai-learning',
            'download-rules-csv', 'create-new-rule', 'download-all-rules-csv',
            'rules-csv-upload', 'save-uploaded-rules-as-database',
            'edit-saved-rule', 'delete-saved-rule', 'download-pending-csv',
            'download-pending-transactions-csv', 'approval-csv-upload',
            'bulk-approve-transactions', 'view-transaction-details',
            'delete-approved-transaction', 'refresh-ai-history',
            'load-more-sessions', 'execute-full-backup', 'export-to-mf',
            'create-manual-backup', 'generate-advanced-report'
        ],
        'description' => '記帳自動化ツール専用JavaScript（競合回避版・実在確認済み）'
    ],
    
    'zaiko_content' => [
        'file' => 'common/js/pages/zaiko.js',
        'priority' => 15,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'zaiko',
        'capture_mode' => true,
        'description' => '在庫管理専用JavaScript（要作成・modules/zaiko/zaiko.js存在）'
    ],
    
    'juchu_kanri_content' => [
        'file' => 'common/js/pages/juchu_kanri.js',
        'priority' => 15,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'juchu',
        'capture_mode' => true,
        'description' => '受注管理専用JavaScript（要作成・modules/juchu/juchu_kanri.js存在）'
    ],
    
    'apikey_content' => [
        'file' => 'common/js/pages/apikey.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'apikey',
        'description' => 'APIキー管理専用JavaScript（要作成・modules/apikey/複数JSファイル存在）'
    ],
    
    'asin_upload_content' => [
        'file' => 'common/js/pages/asin_upload.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'asin_upload',
        'description' => 'ASIN一括登録専用JavaScript（要作成・modules/asin_upload/複数JSファイル存在）'
    ],
    
    'filters_content' => [
        'file' => 'common/js/pages/filters.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'filters',
        'description' => 'フィルター機能専用JavaScript（要作成・modules/filters/複数JSファイル存在）'
    ],
    
    'manual_content' => [
        'file' => 'common/js/pages/manual.js',
        'priority' => 5,
        'required' => false,
        'defer' => true,
        'conflict_avoidance' => false,
        'namespace' => 'manual',
        'description' => 'マニュアル専用JavaScript（要作成・modules/manual/manual.js存在）'
    ],
    
    'settings_content' => [
        'file' => 'common/js/pages/settings.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'settings',
        'description' => 'システム設定専用JavaScript（要作成・modules/sku他統合/settings/複数JSファイル存在）'
    ],
    
    'ai_predictor_content' => [
        'file' => 'common/js/pages/ai_predictor.js',
        'priority' => 10,
        'required' => false,
        'defer' => true,  // AI処理は遅延読み込み
        'conflict_avoidance' => true,
        'namespace' => 'ai_predictor',
        'description' => 'AI予測ツール専用JavaScript（要作成）'
    ],
    
    'ebay_kicho_content' => [
        'file' => 'common/js/pages/ebay_kicho.js',
        'priority' => 15,  // KICHO系は高優先度
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'ebay_kicho',
        'capture_mode' => true,
        'description' => 'eBay記帳ツール専用JavaScript（要作成・modules/kicho_ebay/ebay_kicho.js存在）'
    ],
    
    'shohin_content' => [
        'file' => 'common/js/pages/shohin.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'shohin',
        'description' => '商品管理専用JavaScript（要作成・modules/shohin/script.js存在）'
    ],
    
    // =====================================
    // 🛠️ システム・デバッグツール
    // =====================================
    
    'debug_dashboard' => [
        'file' => 'system_core/debug_system/debug_dashboard.js',
        'priority' => 20,  // 最高優先度
        'required' => false,  // modules/デバックシステム関連/01/debug_dashboard.js存在
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'debug',
        'description' => 'デバッグダッシュボード専用JavaScript（system_core配置推奨）'
    ],
    
    // =====================================
    // 🎯 特殊機能・エラー防止
    // =====================================
    
    'error_prevention' => [
        'file' => 'common/js/pages/error-prevention.js',
        'priority' => 20,
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'error_prevention',
        'description' => 'エラー防止システム（実在確認済み）'
    ],
    
    // =====================================
    // 📝 将来拡張用（ファイル未作成）
    // =====================================
    
    'test_tool_content' => [
        'file' => 'common/js/pages/test_tool.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'test_tool',
        'description' => 'テストツール専用JavaScript（要作成・modules/test_tool/複数JSファイル存在）'
    ],
    
    'ichigen_kanri_content' => [
        'file' => 'common/js/pages/ichigen_kanri.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'ichigen_kanri',
        'description' => '一元管理専用JavaScript（要作成・modules/ichigen_kanri/複数JSファイル存在）'
    ],
    
    'image_manager_content' => [
        'file' => 'common/js/pages/image_manager.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'image_manager',
        'description' => '画像マネージャー専用JavaScript（要作成・modules/image_manager/image_js.js存在）'
    ],
    
    'ai_control_deck_content' => [
        'file' => 'common/js/pages/ai_control_deck.js',
        'priority' => 10,
        'required' => false,
        'defer' => true,
        'conflict_avoidance' => true,
        'namespace' => 'ai_control_deck',
        'description' => 'AI制御デッキ専用JavaScript（要作成）'
    ],
    
    'task_calendar_content' => [
        'file' => 'common/js/pages/task_calendar.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'task_calendar',
        'description' => 'タスクカレンダー専用JavaScript（要作成）'
    ]
];

/**
 * 🎯 既存システム適合情報
 * 
 * ■ 実在ファイル（404エラーなし）:
 * ✅ common/js/pages/kicho.js
 * ✅ common/js/pages/error-prevention.js
 * 
 * ■ モジュール内にある独自JavaScript:
 * ✅ modules/apikey/apikey_extracted.js, js_api_fix.js
 * ✅ modules/asin_upload/asin_upload_complete.js, asin_upload.js
 * ✅ modules/filters/filters.js, NEW/filters-javascript.js, NEW/filters.js
 * ✅ modules/juchu/juchu_kanri.js, real_time_frontend_manager.js
 * ✅ modules/kicho_ebay/ebay_kicho.js
 * ✅ modules/kicho/新規/kicho_separated_js.js, kicho.js
 * ✅ modules/manual/manual.js
 * ✅ modules/shohin/script.js
 * ✅ modules/zaiko/enhanced_inventory.js, zaiko.js
 * ✅ modules/sku他統合/settings/script.js, settings.js
 * ✅ modules/test_tool/複数のJSファイル
 * ✅ modules/デバックシステム関連/01/debug_dashboard.js
 * ✅ modules/ichigen_kanri/app_javascript.js, inventory_javascript.js
 * ✅ modules/image_manager/image_js.js
 * 
 * ■ 競合回避必須モジュール:
 * 🎯 kicho_content: 43個のアクション処理、最優先度
 * 🎯 zaiko_content: 在庫管理系アクション、高優先度
 * 🎯 juchu_kanri_content: 受注管理系アクション、高優先度
 * 🎯 ebay_kicho_content: eBay記帳系アクション、高優先度
 * 
 * ■ 設定方針:
 * 1. common/js/pages/kicho.js は実在するため required: true
 * 2. その他は required: false で404回避
 * 3. 競合回避必須ツールは capture_mode: true 設定
 * 4. modules/ 内のJSファイルは必要に応じて pages/ にコピー推奨
 * 5. AI系・重い処理は defer: true で遅延読み込み
 * 
 * ■ モジュール内JSファイルの活用方法:
 * 1. 重要なファイルは common/js/pages/ にコピー
 * 2. 設定でファイルパスを modules/ 直接指定も可能
 * 3. 複数ファイルある場合は統合版を pages/ に作成推奨
 */