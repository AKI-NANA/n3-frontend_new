<?php
/**
 * CSS分離ルーティングテーブル
 * NAGANO3 3分離ルーティングシステム
 * 
 * 🎯 目的: CSS読み込みの完全外部化管理
 * ✅ 新ツール追加時：1行追加のみ
 * ✅ 404エラー完全回避
 * ✅ キャッシュバスティング自動適用
 * ✅ 優先度制御
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（既存）
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
        'required' => true,
        'description' => '記帳自動化ツール専用CSS'
    ],
    
    'zaiko_content' => [
        'file' => 'common/css/pages/zaiko.css', 
        'priority' => 10,
        'required' => true,
        'description' => '在庫管理専用CSS'
    ],
    
    'juchu_kanri_content' => [
        'file' => 'common/css/pages/juchu.css',
        'priority' => 10, 
        'required' => true,
        'description' => '受注管理専用CSS'
    ],
    
    'shohin_content' => [
        'file' => 'common/css/pages/shohin.css',
        'priority' => 10,
        'required' => false,
        'description' => '商品管理専用CSS'
    ],
    
    'asin_upload_content' => [
        'file' => 'common/css/pages/asin_upload.css',
        'priority' => 10,
        'required' => false,
        'description' => 'ASIN一括登録専用CSS'
    ],
    
    'apikey_content' => [
        'file' => 'common/css/pages/apikey.css',
        'priority' => 10,
        'required' => false,
        'description' => 'API設定専用CSS'
    ],
    
    'settings_content' => [
        'file' => 'common/css/pages/settings.css',
        'priority' => 10,
        'required' => false,
        'description' => 'システム設定専用CSS'
    ],
    
    'toiawase_kanri_content' => [
        'file' => 'common/css/pages/toiawase_kanri.css',
        'priority' => 10,
        'required' => false,
        'description' => '問い合わせ管理専用CSS'
    ],
    
    'shukka_kanri_content' => [
        'file' => 'common/css/pages/shukka_kanri.css',
        'priority' => 10,
        'required' => false,
        'description' => '出荷管理専用CSS'
    ],
    
    // =====================================
    // 🛠️ システム・デバッグツール
    // =====================================
    
    'debug_dashboard' => [
        'file' => 'system_core/debug_system/debug_dashboard_cyan.css',
        'priority' => 15,
        'required' => true,
        'description' => 'デバッグダッシュボード専用CSS'
    ],
    
    // =====================================
    // 🎯 追加ツール（将来拡張用）
    // =====================================
    
    'ai_predictor_content' => [
        'file' => 'common/css/pages/ai_predictor.css',
        'priority' => 10,
        'required' => false,
        'description' => 'AI予測ツール専用CSS'
    ],
    
    'manual_content' => [
        'file' => 'common/css/pages/manual.css',
        'priority' => 5,
        'required' => false,
        'description' => 'マニュアル専用CSS'
    ],
    
    'filters_content' => [
        'file' => 'common/css/pages/filters.css',
        'priority' => 10,
        'required' => false,
        'description' => 'フィルター機能専用CSS'
    ],
    
    'ebay_kicho_content' => [
        'file' => 'common/css/pages/ebay_kicho.css',
        'priority' => 10,
        'required' => false,
        'description' => 'eBay記帳ツール専用CSS'
    ],
    
    'modules_keyword_research_content' => [
        'file' => 'common/css/pages/modules_keyword_research_layout.css',
        'priority' => 10,
        'required' => false,
        'description' => 'キーワードリサーチ専用CSS'
    ],
    
    // =====================================
    // 🎨 特殊ページ・カスタムツール
    // =====================================
    
    'temp_existing_styles_content' => [
        'file' => 'common/css/pages/temp_existing_styles.css',
        'priority' => 1,
        'required' => false,
        'description' => '一時的既存スタイル（レガシー）'
    ],
    
    // =====================================
    // 📝 新ツール追加テンプレート
    // =====================================
    
    /*
    // 新ツール追加例
    'new_tool_content' => [
        'file' => 'common/css/pages/new_tool.css',
        'priority' => 10,
        'required' => true,
        'description' => '新ツール専用CSS'
    ],
    
    // 複数CSSファイル対応例
    'complex_tool_content' => [
        'files' => [
            'common/css/pages/complex_tool_main.css',
            'common/css/pages/complex_tool_components.css'
        ],
        'priority' => 10,
        'required' => true,
        'description' => '複雑ツール専用CSS（複数ファイル）'
    ],
    
    // 条件付き読み込み例
    'conditional_tool_content' => [
        'file' => 'common/css/pages/conditional_tool.css',
        'priority' => 10,
        'required' => false,
        'condition' => function() {
            return isset($_SESSION['premium_user']) && $_SESSION['premium_user'] === true;
        },
        'description' => 'プレミアムユーザー専用CSS'
    ],
    */
];

/**
 * 🎯 CSS ルーティング設定ガイド
 * 
 * ■ 設定項目説明:
 * 
 * 'file' (string, required)
 *   - CSSファイルのパス（ドキュメントルートからの相対パス）
 *   - 例: 'common/css/pages/tool_name.css'
 * 
 * 'files' (array, optional)
 *   - 複数CSSファイルの場合に使用
 *   - 'file'の代わりに使用（排他的）
 * 
 * 'priority' (int, optional, default: 10)
 *   - CSS読み込み優先度
 *   - 1-20の範囲（数値が大きいほど後で読み込み）
 *   - 5: 低優先度（ベース）
 *   - 10: 標準優先度（通常ツール）
 *   - 15: 高優先度（システム・デバッグ）
 *   - 20: 最高優先度（オーバーライド用）
 * 
 * 'required' (bool, optional, default: false)
 *   - true: 必須ファイル（存在しない場合はエラーログ）
 *   - false: オプションファイル（存在しなくても継続）
 * 
 * 'description' (string, optional)
 *   - CSS設定の説明（ドキュメント用）
 * 
 * 'condition' (callable, optional)
 *   - 条件付き読み込み関数
 *   - trueを返す場合のみCSS読み込み実行
 * 
 * ■ 新ツール追加手順:
 * 1. 上記配列に新しいエントリを追加
 * 2. 実際のCSSファイルを作成
 * 3. 完了（他のファイル修正不要）
 * 
 * ■ ファイル命名規則:
 * - ページ名_content => tool_name.css
 * - 例: 'new_tool_content' => 'new_tool.css'
 * 
 * ■ パフォーマンス最適化:
 * - ファイル存在チェック: 自動キャッシュ（5分間）
 * - キャッシュバスティング: filemtime()による自動バージョン管理
 * - 404エラー回避: 存在しないファイルの自動スキップ
 * - 条件付き読み込み: 不要なCSSの読み込み回避
 */