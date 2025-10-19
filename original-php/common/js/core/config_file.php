<?php
/**
 * 🔧 JavaScript自動ローダー段階的有効化設定
 * config/js_auto_loader.php
 * 
 * 【使用方法】
 * 1. このファイルを config/js_auto_loader.php として保存
 * 2. 段階に応じてコメントアウトを調整
 * 3. 1行変更するだけで即座に有効/無効切り替え可能
 */

// =====================================
// Phase 1: 完全無効（既存システムのみ）
// =====================================
// 最も安全な状態 - 既存システムがそのまま動作
define('JS_AUTO_LOADER_ENABLED', false);

// =====================================
// Phase 2: 特定ページのみテスト
// =====================================
// 段階的導入開始 - 限定ページでのみ動作
// define('JS_AUTO_LOADER_ENABLED', true);
// define('JS_AUTO_LOADER_TEST_PAGES', ['test_page', 'new_feature']);

// =====================================
// Phase 3: 段階拡大テスト
// =====================================
// 対象ページを徐々に拡大
// define('JS_AUTO_LOADER_ENABLED', true);
// define('JS_AUTO_LOADER_TEST_PAGES', [
//     'test_page', 
//     'dashboard', 
//     'report_generator',
//     'user_management'
// ]);

// =====================================
// Phase 4: 全面移行
// =====================================
// 全ページで自動ローダー有効化
// define('JS_AUTO_LOADER_ENABLED', true);
// define('JS_AUTO_LOADER_ALL_PAGES', true);

// =====================================
// 開発・デバッグ設定
// =====================================

// デバッグモード（開発時のみ有効化）
// define('JS_AUTO_LOADER_DEBUG', true);

// 詳細ログ有効化
// define('JS_AUTO_LOADER_VERBOSE', true);

// パフォーマンス監視
// define('JS_AUTO_LOADER_PERFORMANCE', true);

// =====================================
// 緊急対応設定
// =====================================

// 緊急完全無効化 (最優先)
// define('JS_AUTO_LOADER_EMERGENCY_DISABLE', true);

// 特定ページ緊急除外
// define('JS_AUTO_LOADER_EXCLUDE_PAGES', ['kicho_content', 'critical_page']);

// =====================================
// 高度な設定
// =====================================

// カスタムタイムアウト (ミリ秒)
// define('JS_AUTO_LOADER_TIMEOUT', 15000);

// 最大リトライ回数
// define('JS_AUTO_LOADER_MAX_RETRIES', 3);

// 並列読み込み有効化 (注意: 依存関係要確認)
// define('JS_AUTO_LOADER_PARALLEL', false);

// =====================================
// 設定検証関数
// =====================================

/**
 * 設定の妥当性チェック
 * @return bool 設定が妥当か
 */
function validate_js_auto_loader_config() {
    // 基本設定チェック
    if (!defined('JS_AUTO_LOADER_ENABLED')) {
        error_log('JS Auto Loader: ENABLED not defined');
        return false;
    }
    
    // 緊急無効化チェック
    if (defined('JS_AUTO_LOADER_EMERGENCY_DISABLE') && JS_AUTO_LOADER_EMERGENCY_DISABLE) {
        error_log('JS Auto Loader: Emergency disable is active');
        return false;
    }
    
    // テストページ設定チェック
    if (defined('JS_AUTO_LOADER_ENABLED') && JS_AUTO_LOADER_ENABLED) {
        if (!defined('JS_AUTO_LOADER_ALL_PAGES') && !defined('JS_AUTO_LOADER_TEST_PAGES')) {
            error_log('JS Auto Loader: No target pages defined');
            return false;
        }
    }
    
    return true;
}

/**
 * 現在の設定状態を取得
 * @return array 設定情報
 */
function get_js_auto_loader_status() {
    return [
        'enabled' => defined('JS_AUTO_LOADER_ENABLED') ? JS_AUTO_LOADER_ENABLED : false,
        'all_pages' => defined('JS_AUTO_LOADER_ALL_PAGES') ? JS_AUTO_LOADER_ALL_PAGES : false,
        'test_pages' => defined('JS_AUTO_LOADER_TEST_PAGES') ? JS_AUTO_LOADER_TEST_PAGES : [],
        'debug_mode' => defined('JS_AUTO_LOADER_DEBUG') ? JS_AUTO_LOADER_DEBUG : false,
        'emergency_disabled' => defined('JS_AUTO_LOADER_EMERGENCY_DISABLE') ? JS_AUTO_LOADER_EMERGENCY_DISABLE : false,
        'exclude_pages' => defined('JS_AUTO_LOADER_EXCLUDE_PAGES') ? JS_AUTO_LOADER_EXCLUDE_PAGES : [],
        'config_file_path' => __FILE__,
        'last_modified' => date('Y-m-d H:i:s', filemtime(__FILE__))
    ];
}

/**
 * 指定ページで自動ローダーが動作するかチェック
 * @param string $page_name ページ名
 * @return bool 動作するか
 */
function should_js_auto_loader_run($page_name) {
    // 設定検証
    if (!validate_js_auto_loader_config()) {
        return false;
    }
    
    // 有効化チェック
    if (!defined('JS_AUTO_LOADER_ENABLED') || !JS_AUTO_LOADER_ENABLED) {
        return false;
    }
    
    // 緊急無効化チェック
    if (defined('JS_AUTO_LOADER_EMERGENCY_DISABLE') && JS_AUTO_LOADER_EMERGENCY_DISABLE) {
        return false;
    }
    
    // 除外ページチェック
    if (defined('JS_AUTO_LOADER_EXCLUDE_PAGES')) {
        $exclude_pages = JS_AUTO_LOADER_EXCLUDE_PAGES;
        if (in_array($page_name, $exclude_pages)) {
            return false;
        }
    }
    
    // 全ページ有効チェック
    if (defined('JS_AUTO_LOADER_ALL_PAGES') && JS_AUTO_LOADER_ALL_PAGES) {
        return true;
    }
    
    // テストページチェック
    if (defined('JS_AUTO_LOADER_TEST_PAGES')) {
        $test_pages = JS_AUTO_LOADER_TEST_PAGES;
        return in_array($page_name, $test_pages);
    }
    
    return false;
}

// =====================================
// 設定初期化・検証実行
// =====================================

// 設定検証実行
$config_valid = validate_js_auto_loader_config();

// ログ出力 (デバッグモード時)
if (defined('JS_AUTO_LOADER_DEBUG') && JS_AUTO_LOADER_DEBUG) {
    error_log('JS Auto Loader Config Loaded: ' . ($config_valid ? 'Valid' : 'Invalid'));
    error_log('JS Auto Loader Status: ' . json_encode(get_js_auto_loader_status()));
}

// =====================================
// 段階別移行手順コメント
// =====================================

/**
 * 【段階別移行手順】
 * 
 * Phase 1: 安全確認
 * ┌─────────────────────────────────────┐
 * │ define('JS_AUTO_LOADER_ENABLED', false); │
 * └─────────────────────────────────────┘
 * → 既存システムが正常動作することを確認
 * 
 * Phase 2: 限定テスト
 * ┌─────────────────────────────────────┐
 * │ define('JS_AUTO_LOADER_ENABLED', true);  │
 * │ define('JS_AUTO_LOADER_TEST_PAGES',      │
 * │        ['test_page']);                   │
 * └─────────────────────────────────────┘
 * → test_page でのみ自動ローダーが動作
 * 
 * Phase 3: 段階拡大
 * ┌─────────────────────────────────────┐
 * │ define('JS_AUTO_LOADER_TEST_PAGES',      │
 * │        ['test_page', 'dashboard']);      │
 * └─────────────────────────────────────┘
 * → 対象ページを徐々に拡大
 * 
 * Phase 4: 全面移行
 * ┌─────────────────────────────────────┐
 * │ define('JS_AUTO_LOADER_ALL_PAGES', true);│
 * └─────────────────────────────────────┘
 * → 全ページで自動ローダー有効
 */

/**
 * 【緊急時復旧手順】
 * 
 * 方法1: 設定無効化
 * define('JS_AUTO_LOADER_ENABLED', false);
 * 
 * 方法2: 緊急無効化
 * define('JS_AUTO_LOADER_EMERGENCY_DISABLE', true);
 * 
 * 方法3: ファイル削除
 * rm common/js/core/js_auto_loader.js
 * rm common/js/core/js_auto_config.js
 * 
 * 方法4: 設定ファイル削除
 * rm config/js_auto_loader.php
 */

/**
 * 【開発時の便利コマンド】
 * 
 * 設定確認:
 * <?php print_r(get_js_auto_loader_status()); ?>
 * 
 * ページ別動作確認:
 * <?php var_dump(should_js_auto_loader_run('kicho_content')); ?>
 * 
 * JavaScriptコンソールでの確認:
 * console.log(window.JS_AUTO_LOADER_PHP_CONFIG);
 * console.log(window.jsAutoLoaderDebug.getStatus());
 */
?>
