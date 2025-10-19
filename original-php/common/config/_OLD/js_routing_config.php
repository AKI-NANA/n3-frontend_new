<?php
/**
 * JavaScript分離ルーティングテーブル
 * NAGANO3 3分離ルーティングシステム
 * 
 * 🎯 目的: JavaScript読み込みの完全外部化管理
 * ✅ 新ツール追加時：1行追加のみ
 * ✅ 404エラー完全回避
 * ✅ 競合回避システム統合（エラー回避_3.md準拠）
 * ✅ 優先度制御・defer対応
 */

if (!defined('SECURE_ACCESS')) {
    die('Direct access denied');
}

return [
    // =====================================
    // 🎯 メインツール（既存・競合回避対応）
    // =====================================
    
    'dashboard' => [
        'file' => 'common/js/pages/dashboard.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'dashboard',
        'description' => 'ダッシュボード専用JavaScript'
    ],
    
    'kicho_content' => [
        'file' => 'common/js/pages/kicho.js',
        'priority' => 15,  // 高優先度（競合回避のため）
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'kicho',
        'capture_mode' => true,  // useCapture=true
        'description' => '記帳自動化ツール専用JavaScript（競合回避版）'
    ],
    
    'zaiko_content' => [
        'file' => 'common/js/pages/zaiko.js',
        'priority' => 15,  // 高優先度（競合回避のため）
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'zaiko',
        'capture_mode' => true,
        'description' => '在庫管理専用JavaScript（競合回避版）'
    ],
    
    'juchu_kanri_content' => [
        'file' => 'common/js/pages/juchu.js',
        'priority' => 15,  // 高優先度（競合回避のため）
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'juchu',
        'capture_mode' => true,
        'description' => '受注管理専用JavaScript（競合回避版）'
    ],
    
    'shohin_content' => [
        'file' => 'common/js/pages/shohin.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'shohin',
        'description' => '商品管理専用JavaScript'
    ],
    
    'asin_upload_content' => [
        'file' => 'common/js/pages/asin_upload.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'asin_upload',
        'description' => 'ASIN一括登録専用JavaScript'
    ],
    
    'apikey_content' => [
        'file' => 'common/js/pages/apikey.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => false,  // 基本機能のみ
        'namespace' => 'apikey',
        'description' => 'API設定専用JavaScript'
    ],
    
    'settings_content' => [
        'file' => 'common/js/pages/settings.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'settings',
        'description' => 'システム設定専用JavaScript'
    ],
    
    'toiawase_kanri_content' => [
        'file' => 'common/js/pages/toiawase_kanri.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'toiawase_kanri',
        'description' => '問い合わせ管理専用JavaScript'
    ],
    
    'shukka_kanri_content' => [
        'file' => 'common/js/pages/shukka_kanri.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'shukka_kanri',
        'description' => '出荷管理専用JavaScript'
    ],
    
    // =====================================
    // 🛠️ システム・デバッグツール
    // =====================================
    
    'debug_dashboard' => [
        'file' => 'system_core/debug_system/debug_dashboard.js',
        'priority' => 20,  // 最高優先度
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => false,
        'namespace' => 'debug',
        'description' => 'デバッグダッシュボード専用JavaScript'
    ],
    
    // =====================================
    // 🎯 追加ツール（将来拡張用）
    // =====================================
    
    'ai_predictor_content' => [
        'file' => 'common/js/pages/ai_predictor.js',
        'priority' => 10,
        'required' => false,
        'defer' => true,  // AI処理は遅延読み込み
        'conflict_avoidance' => true,
        'namespace' => 'ai_predictor',
        'description' => 'AI予測ツール専用JavaScript'
    ],
    
    'manual_content' => [
        'file' => 'common/js/pages/manual.js',
        'priority' => 5,   // 低優先度
        'required' => false,
        'defer' => true,
        'conflict_avoidance' => false,
        'namespace' => 'manual',
        'description' => 'マニュアル専用JavaScript'
    ],
    
    'filters_content' => [
        'file' => 'common/js/pages/filters.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'filters',
        'description' => 'フィルター機能専用JavaScript'
    ],
    
    'ebay_kicho_content' => [
        'file' => 'common/js/pages/ebay_kicho.js',
        'priority' => 15,  // KICHO系は高優先度
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'ebay_kicho',
        'capture_mode' => true,
        'description' => 'eBay記帳ツール専用JavaScript（競合回避版）'
    ],
    
    'modules_keyword_research_content' => [
        'file' => 'common/js/pages/modules_keyword_research.js',
        'priority' => 10,
        'required' => false,
        'defer' => true,  // リサーチ系は遅延読み込み
        'conflict_avoidance' => true,
        'namespace' => 'keyword_research',
        'description' => 'キーワードリサーチ専用JavaScript'
    ],
    
    // =====================================
    // 🎨 特殊ページ・カスタムツール
    // =====================================
    
    'temp_existing_content' => [
        'file' => 'common/js/pages/temp_existing.js',
        'priority' => 1,   // 最低優先度
        'required' => false,
        'defer' => true,
        'conflict_avoidance' => false,
        'namespace' => 'temp',
        'description' => '一時的既存スクリプト（レガシー）'
    ],
    
    // =====================================
    // 📝 新ツール追加テンプレート
    // =====================================
    
    /*
    // 基本ツール追加例
    'new_tool_content' => [
        'file' => 'common/js/pages/new_tool.js',
        'priority' => 10,
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'new_tool',
        'description' => '新ツール専用JavaScript'
    ],
    
    // 競合回避必須ツール例（KICHO系）
    'important_tool_content' => [
        'file' => 'common/js/pages/important_tool.js',
        'priority' => 15,
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'important_tool',
        'capture_mode' => true,
        'actions' => [
            'execute-important-action',
            'process-important-data',
            'save-important-settings'
        ],
        'description' => '重要ツール専用JavaScript（完全競合回避版）'
    ],
    
    // 複数ファイル対応例
    'complex_tool_content' => [
        'files' => [
            'common/js/pages/complex_tool_core.js',
            'common/js/pages/complex_tool_components.js',
            'common/js/pages/complex_tool_widgets.js'
        ],
        'priority' => 10,
        'required' => true,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'complex_tool',
        'description' => '複雑ツール専用JavaScript（複数ファイル）'
    ],
    
    // 条件付き読み込み例
    'premium_tool_content' => [
        'file' => 'common/js/pages/premium_tool.js',
        'priority' => 10,
        'required' => false,
        'defer' => false,
        'conflict_avoidance' => true,
        'namespace' => 'premium_tool',
        'condition' => function() {
            return isset($_SESSION['premium_user']) && $_SESSION['premium_user'] === true;
        },
        'description' => 'プレミアムユーザー専用JavaScript'
    ],
    */
];

/**
 * 🎯 JavaScript ルーティング設定ガイド
 * 
 * ■ 設定項目説明:
 * 
 * 'file' (string, required)
 *   - JavaScriptファイルのパス（ドキュメントルートからの相対パス）
 *   - 例: 'common/js/pages/tool_name.js'
 * 
 * 'files' (array, optional)
 *   - 複数JSファイルの場合に使用
 *   - 'file'の代わりに使用（排他的）
 * 
 * 'priority' (int, optional, default: 10)
 *   - JavaScript読み込み優先度
 *   - 1-20の範囲（数値が大きいほど後で読み込み）
 *   - 5: 低優先度（マニュアル等）
 *   - 10: 標準優先度（通常ツール）
 *   - 15: 高優先度（KICHO系・競合回避必須）
 *   - 20: 最高優先度（システム・デバッグ）
 * 
 * 'required' (bool, optional, default: false)
 *   - true: 必須ファイル（存在しない場合はエラーログ）
 *   - false: オプションファイル（存在しなくても継続）
 * 
 * 'defer' (bool, optional, default: false)
 *   - true: defer属性付与（HTML解析後に実行）
 *   - false: 即座に実行
 * 
 * 'conflict_avoidance' (bool, optional, default: false)
 *   - true: JavaScript競合回避システム適用
 *   - false: 標準読み込み
 * 
 * 'namespace' (string, optional)
 *   - JavaScriptの名前空間
 *   - 例: 'kicho' => window.NAGANO3_KICHO
 * 
 * 'capture_mode' (bool, optional, default: false)
 *   - true: useCapture=true で最優先イベント処理
 *   - false: 標準イベント処理
 *   - ※ KICHO系ツールでの競合回避に必須
 * 
 * 'actions' (array, optional)
 *   - 対象ツールが処理するdata-action一覧
 *   - 競合回避システムでの優先処理対象
 * 
 * 'description' (string, optional)
 *   - JavaScript設定の説明（ドキュメント用）
 * 
 * 'condition' (callable, optional)
 *   - 条件付き読み込み関数
 *   - trueを返す場合のみJavaScript読み込み実行
 * 
 * ■ 競合回避システム（エラー回避_3.md準拠）:
 * 
 * 1. 優先度付きイベント委譲
 *    - capture_mode: true => useCapture=true で最優先実行
 *    - priority: 15+ => 他のJSより先に処理
 * 
 * 2. 名前空間分離
 *    - namespace設定で完全分離
 *    - window.NAGANO3_[NAMESPACE] で管理
 * 
 * 3. ページ判定システム
 *    - 各ツールは対象ページでのみ動作
 *    - IS_[NAMESPACE]_PAGE による制御
 * 
 * 4. イベント伝播制御
 *    - event.stopImmediatePropagation() で他JS完全ブロック
 *    - 処理完了後 return false で伝播停止
 * 
 * ■ 新ツール追加手順:
 * 1. 上記配列に新しいエントリを追加
 * 2. 実際のJavaScriptファイルを作成
 * 3. 競合回避が必要な場合は conflict_avoidance: true を設定
 * 4. 完了（他のファイル修正不要）
 * 
 * ■ ファイル命名規則:
 * - ページ名_content => tool_name.js
 * - 例: 'new_tool_content' => 'new_tool.js'
 * 
 * ■ パフォーマンス最適化:
 * - ファイル存在チェック: 自動キャッシュ（5分間）
 * - キャッシュバスティング: filemtime()による自動バージョン管理
 * - 404エラー回避: 存在しないファイルの自動スキップ
 * - 条件付き読み込み: 不要なJavaScriptの読み込み回避
 * - defer最適化: 重い処理の遅延実行
 */