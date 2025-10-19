<?php
/**
 * ページルーティング設定
 * NAGANO3 3分離ルーティングシステム
 * 
 * 🎯 目的: ページタイトル・ファイルパスの一元管理
 * ✅ 現在のindex.phpから移行
 * ✅ 50+ツール対応
 * ✅ 動的拡張可能
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 📄 ページタイトル定義
    // =====================================
    'page_titles' => [
        // メインページ
        'dashboard' => 'ダッシュボード',
        
        // 記帳・会計系
        'kicho_content' => '記帳自動化ツール',
        'ebay_kicho_content' => 'eBay記帳ツール',
        'kaikei_shisan_content' => '会計資産管理',
        
        // 在庫・商品管理系
        'zaiko_content' => '在庫管理',
        'shohin_content' => '商品管理',
        'hybrid_inventory_dashboard_content' => 'ハイブリッド在庫ダッシュボード',
        
        // 受注・出荷系
        'juchu_kanri_content' => '受注管理',
        'shukka_kanri_content' => '出荷管理',
        'chumon_content' => '注文管理',
        
        // 販売・取引系
        'kokunai_hanbai_content' => '国内販売管理',
        'kaigai_hanbai_content' => '海外販売管理',
        'torihiki_content' => '取引管理',
        'uriage_content' => '売上管理',
        
        // 顧客・問い合わせ系
        'toiawase_kanri_content' => '問い合わせ管理',
        'ichigen_kanri_content' => '一元管理',
        
        // データ・分析系
        'bunseki_content' => '分析ツール',
        'ai_predictor_content' => 'AI予測システム',
        'ai_control_deck_content' => 'AI制御デッキ',
        'filters_content' => 'フィルター機能',
        
        // 設定・管理系
        'apikey_content' => 'APIキー管理',
        'settings_content' => 'システム設定',
        'manual_content' => 'マニュアル',
        
        // アップロード・インポート系
        'asin_upload_content' => 'ASIN一括登録',
        'gazou_kanri_content' => '画像管理',
        'image_manager_content' => '画像マネージャー',
        
        // システム・デバッグ系
        'debug_dashboard' => 'デバッグダッシュボード',
        'test_tool_content' => 'テストツール',
        'backend_tools_content' => 'バックエンドツール',
        
        // 特殊・実験系
        'task_calendar_content' => 'タスクカレンダー',
        'mall_tougou_content' => 'モール統合',
        'souryou_content' => '送料計算',
        'souryou_keisan_content' => '送料計算システム',
        
        // レガシー・移行中
        'temp_existing_content' => '既存システム（移行中）'
    ],
    
    // =====================================
    // 📁 特殊ページ（system_core配下）
    // =====================================
    'special_pages' => [
        'debug_dashboard' => 'system_core/debug_system/debug_dashboard_content.php'
    ],
    
    // =====================================
    // 📂 既存ページ（modules配下）
    // =====================================
    'existing_pages' => [
        // メインページ
        'dashboard' => 'dashboard/dashboard_content.php',
        
        // 記帳・会計系
        'kicho_content' => 'kicho/kicho_content.php',
        'ebay_kicho_content' => 'kicho_ebay/ebay_kicho_content.php',
        'kaikei_shisan_content' => 'kaikei_shisan/kaikei_shisan_content.php',
        
        // 在庫・商品管理系
        'zaiko_content' => 'zaiko/zaiko_content.php',
        'shohin_content' => 'shohin/shohin_content.php',
        'hybrid_inventory_dashboard_content' => 'hybrid_inventory_dashboard/hybrid_inventory_dashboard_content.php',
        
        // 受注・出荷系
        'juchu_kanri_content' => 'juchu/juchu_kanri_content.php',
        'shukka_kanri_content' => 'shukka/shukka_kanri_content.php',
        'chumon_content' => 'chumon/chumon_content.php',
        
        // 販売・取引系
        'kokunai_hanbai_content' => 'kokunai_hanbai/kokunai_hanbai_content.php',
        'kaigai_hanbai_content' => 'kaigai_hanbai/kaigai_hanbai_content.php',
        'torihiki_content' => 'torihiki/torihiki_content.php',
        'uriage_content' => 'uriage/uriage_content.php',
        
        // 顧客・問い合わせ系
        'toiawase_kanri_content' => 'toiawase/toiawase_kanri_content.php',
        'ichigen_kanri_content' => 'ichigen_kanri/ichigen_kanri_content.php',
        
        // データ・分析系
        'bunseki_content' => 'bunseki/bunseki_content.php',
        'ai_predictor_content' => 'ai_predictor/ai_predictor_content.php',
        'ai_control_deck_content' => 'ai_control_deck/ai_control_deck_content.php',
        'filters_content' => 'filters/filters_content.php',
        
        // 設定・管理系
        'apikey_content' => 'apikey/apikey_content.php',
        'settings_content' => 'settings/settings_content.php',
        'manual_content' => 'manual/manual_content.php',
        
        // アップロード・インポート系
        'asin_upload_content' => 'asin_upload/asin_upload_content.php',
        'gazou_kanri_content' => 'gazou_kanri/gazou_kanri_content.php',
        'image_manager_content' => 'image_manager/image_manager_content.php',
        
        // システム・デバッグ系
        'test_tool_content' => 'test_tool/test_tool_content.php',
        'backend_tools_content' => 'backend_tools/backend_tools_content.php',
        
        // 特殊・実験系
        'task_calendar_content' => 'task_calendar/task_calendar_content.php',
        'mall_tougou_content' => 'mall_tougou/mall_tougou_content.php',
        'souryou_content' => 'souryou/souryou_content.php',
        'souryou_keisan_content' => 'souryou/souryou_keisan_content.php'
    ],
    
    // =====================================
    // 🔒 アクセス制御設定
    // =====================================
    'access_control' => [
        // 管理者専用ページ
        'admin_only' => [
            'debug_dashboard',
            'backend_tools_content',
            'test_tool_content'
        ],
        
        // 認証必須ページ
        'auth_required' => [
            'apikey_content',
            'settings_content',
            'ai_control_deck_content'
        ],
        
        // ゲストアクセス可能
        'guest_accessible' => [
            'manual_content'
        ]
    ],
    
    // =====================================
    // 📊 メタデータ設定
    // =====================================
    'meta_data' => [
        'kicho_content' => [
            'description' => 'NAGANO3記帳自動化ツール - AI搭載の高機能記帳システム',
            'keywords' => '記帳,自動化,AI,会計,NAGANO3',
            'category' => '記帳・会計'
        ],
        
        'zaiko_content' => [
            'description' => 'NAGANO3在庫管理システム - リアルタイム在庫追跡',
            'keywords' => '在庫管理,商品管理,NAGANO3',
            'category' => '在庫・商品'
        ],
        
        'juchu_kanri_content' => [
            'description' => 'NAGANO3受注管理システム - 効率的な注文処理',
            'keywords' => '受注管理,注文処理,NAGANO3',
            'category' => '受注・出荷'
        ],
        
        'debug_dashboard' => [
            'description' => 'NAGANO3デバッグダッシュボード - システム監視・診断',
            'keywords' => 'デバッグ,監視,システム管理,NAGANO3',
            'category' => 'システム管理'
        ]
    ],
    
    // =====================================
    // 🎨 レイアウト設定
    // =====================================
    'layout_settings' => [
        // フルスクリーンページ
        'fullscreen' => [
            'debug_dashboard',
            'ai_control_deck_content'
        ],
        
        // サイドバー非表示
        'no_sidebar' => [
            'manual_content'
        ],
        
        // 特殊レイアウト
        'custom_layout' => [
            'dashboard' => 'dashboard_layout',
            'ai_predictor_content' => 'ai_layout'
        ]
    ]
];

/**
 * 🎯 ページルーティング設定ガイド
 * 
 * ■ page_titles:
 * - ページタイトル定義
 * - <title>タグとページヘッダーに使用
 * - SEO最適化のため具体的な説明を推奨
 * 
 * ■ special_pages:
 * - system_core/ 配下の特殊ページ
 * - 通常のmodules/構造と異なるファイル
 * 
 * ■ existing_pages:
 * - modules/ 配下の標準ページ
 * - パス指定は modules/ からの相対パス
 * 
 * ■ access_control:
 * - ページレベルのアクセス制御
 * - セキュリティレイヤーとして機能
 * 
 * ■ meta_data:
 * - SEO最適化用メタデータ
 * - 各ページの詳細情報
 * 
 * ■ layout_settings:
 * - ページ固有のレイアウト設定
 * - UI/UX最適化
 * 
 * ■ 新ページ追加手順:
 * 1. page_titles に表示名追加
 * 2. existing_pages または special_pages にファイルパス追加
 * 3. 必要に応じて access_control, meta_data, layout_settings 設定
 * 4. 対応するCSS・JS・Ajaxルーティングも設定
 * 
 * ■ カテゴリ分類:
 * - 記帳・会計系: kicho, ebay_kicho, kaikei_shisan
 * - 在庫・商品系: zaiko, shohin, hybrid_inventory_dashboard
 * - 受注・出荷系: juchu_kanri, shukka_kanri, chumon
 * - 販売・取引系: kokunai_hanbai, kaigai_hanbai, torihiki, uriage
 * - 顧客・問い合わせ系: toiawase_kanri, ichigen_kanri
 * - データ・分析系: bunseki, ai_predictor, ai_control_deck, filters
 * - 設定・管理系: apikey, settings, manual
 * - システム系: debug_dashboard, test_tool, backend_tools
 */