<?php
/**
 * CSS分離ルーティングテーブル - 既存システム最適化版
 * 既存のファイル構造に完全適合（404エラー回避）
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（実在ファイル確認済み）
    // =====================================
    
    'dashboard' => [
        'file' => 'common/css/pages/dashboard.css',
        'priority' => 10,
        'required' => false,
        'description' => 'ダッシュボード専用CSS'
    ],
    
    'kicho_content' => [
        'file' => 'common/css/pages/kicho.css',
        'priority' => 10,
        'required' => true,  // 3分離ルーティングで管理
        'description' => '記帳自動化ツール専用CSS（3分離ルーティング管理）'
    ],
    
    'zaiko_content' => [
        'file' => 'common/css/pages/zaiko.css',
        'priority' => 10,
        'required' => true,
        'description' => '在庫管理専用CSS（実在確認済み）'
    ],
    
    'juchu_kanri_content' => [
        'file' => 'common/css/pages/juchu_kanri.css',
        'priority' => 10,
        'required' => true,
        'description' => '受注管理専用CSS（実在確認済み）'
    ],
    
    'apikey_content' => [
        'file' => 'common/css/pages/apikey.css',
        'priority' => 10,
        'required' => true,
        'description' => 'APIキー管理専用CSS（実在確認済み）'
    ],
    
    'asin_upload_content' => [
        'file' => 'common/css/pages/asin_upload.css',
        'priority' => 10,
        'required' => true,
        'description' => 'ASIN一括登録専用CSS（実在確認済み）'
    ],
    
    'filters_content' => [
        'file' => 'common/css/pages/filters.css',
        'priority' => 10,
        'required' => true,
        'description' => 'フィルター機能専用CSS（実在確認済み）'
    ],
    
    'manual_content' => [
        'file' => 'common/css/pages/manual.css',
        'priority' => 5,
        'required' => true,
        'description' => 'マニュアル専用CSS（実在確認済み）'
    ],
    
    'settings_content' => [
        'file' => 'common/css/pages/settings.css',
        'priority' => 10,
        'required' => true,
        'description' => 'システム設定専用CSS（実在確認済み）'
    ],
    
    'ai_predictor_content' => [
        'file' => 'common/css/pages/ai_predictor.css',
        'priority' => 10,
        'required' => true,
        'description' => 'AI予測ツール専用CSS（実在確認済み）'
    ],
    
    'ebay_kicho_content' => [
        'file' => 'common/css/pages/ebay_kicho.css',
        'priority' => 10,
        'required' => true,
        'description' => 'eBay記帳ツール専用CSS（実在確認済み）'
    ],
    
    'shukka_kanri_content' => [
        'file' => 'common/css/pages/shukka_kanri.css',
        'priority' => 10,
        'required' => true,
        'description' => '出荷管理専用CSS（実在確認済み）'
    ],
    
    'toiawase_kanri_content' => [
        'file' => 'common/css/pages/toiawase_kanri.css',
        'priority' => 10,
        'required' => true,
        'description' => '問い合わせ管理専用CSS（実在確認済み）'
    ],
    
    'shohin_content' => [
        'file' => 'common/css/pages/temp_existing_styles.css',
        'priority' => 10,
        'required' => false,
        'description' => '商品管理専用CSS（temp_existing_stylesを使用）'
    ],
    
    // =====================================
    // 🛠️ システム・デバッグツール
    // =====================================
    
    'debug_dashboard' => [
        'file' => 'system_core/debug_system/debug_dashboard_cyan.css',
        'priority' => 15,
        'required' => true,
        'description' => 'デバッグダッシュボード専用CSS（実在確認済み）'
    ],
    
    // =====================================
    // 🎯 特殊ページ・実験的ツール
    // =====================================
    
    'modules_keys_content' => [
        'file' => 'common/css/pages/modules_keys_css_layout.css',
        'priority' => 10,
        'required' => false,
        'description' => 'モジュールキー管理専用CSS（実在確認済み）'
    ],
    
    'temp_existing_styles_content' => [
        'file' => 'common/css/pages/temp_existing_styles.css',
        'priority' => 1,
        'required' => false,
        'description' => '一時的既存スタイル（レガシー・実在確認済み）'
    ],
    
    // =====================================
    // 📝 将来拡張用（ファイル未作成）
    // =====================================
    
    'ichigen_kanri_content' => [
        'file' => 'common/css/pages/ichigen_kanri.css',
        'priority' => 10,
        'required' => false,
        'description' => '一元管理専用CSS（要作成）'
    ],
    
    'gazou_kanri_content' => [
        'file' => 'common/css/pages/gazou_kanri.css',
        'priority' => 10,
        'required' => false,
        'description' => '画像管理専用CSS（要作成）'
    ],
    
    'hybrid_inventory_dashboard_content' => [
        'file' => 'common/css/pages/hybrid_inventory_dashboard.css',
        'priority' => 10,
        'required' => false,
        'description' => 'ハイブリッド在庫ダッシュボード専用CSS（要作成）'
    ],
    
    'test_tool_content' => [
        'file' => 'common/css/pages/test_tool.css',
        'priority' => 10,
        'required' => false,
        'description' => 'テストツール専用CSS（要作成）'
    ],
    
    'task_calendar_content' => [
        'file' => 'common/css/pages/task_calendar.css',
        'priority' => 10,
        'required' => false,
        'description' => 'タスクカレンダー専用CSS（要作成）'
    ],
    
    'ai_control_deck_content' => [
        'file' => 'common/css/pages/ai_control_deck.css',
        'priority' => 10,
        'required' => false,
        'description' => 'AI制御デッキ専用CSS（要作成）'
    ],
    
    'image_manager_content' => [
        'file' => 'common/css/pages/image_manager.css',
        'priority' => 10,
        'required' => false,
        'description' => '画像マネージャー専用CSS（要作成）'
    ]
];

/**
 * 🎯 既存システム適合情報
 * 
 * ■ 実在ファイル（404エラーなし）:
 * ✅ common/css/pages/dashboard.css
 * ✅ common/css/pages/kicho.css
 * ✅ common/css/pages/zaiko.css
 * ✅ common/css/pages/juchu_kanri.css
 * ✅ common/css/pages/apikey.css
 * ✅ common/css/pages/asin_upload.css
 * ✅ common/css/pages/filters.css
 * ✅ common/css/pages/manual.css
 * ✅ common/css/pages/settings.css
 * ✅ common/css/pages/ai_predictor.css
 * ✅ common/css/pages/ebay_kicho.css
 * ✅ common/css/pages/shukka_kanri.css
 * ✅ common/css/pages/toiawase_kanri.css
 * ✅ common/css/pages/debug_dashboard.css
 * ✅ common/css/pages/modules_keys_css_layout.css
 * ✅ common/css/pages/temp_existing_styles.css
 * 
 * ■ モジュール内にある独自CSS:
 * - modules/ai_predictor/ai_predictor.css
 * - modules/apikey/apikey.css
 * - modules/asin_upload/asin_upload.css
 * - modules/filters/filters.css
 * - modules/kicho/新規/kicho.css
 * - modules/zaiko/zaiko.css
 * - modules/manual/manual.css
 * 
 * ■ 多数存在する modules/ ディレクトリ:
 * 11_ichigen_kanri, ai_control_deck, ai_predictor, apikey, asin_upload,
 * backend_tools, filters, gazou_kanri, hybrid_inventory_dashboard,
 * ichigen_kanri, image_manager, juchu, kicho, kicho_ebay, manual,
 * shohin, test_tool, zaiko など50+のモジュール
 * 
 * ■ 設定方針:
 * 1. 既存の common/css/pages/ ファイルを優先使用
 * 2. 存在しないファイルは required: false で404回避
 * 3. 将来拡張時は required: true に変更
 * 4. モジュール内CSSは必要に応じて pages/ にコピー
 */