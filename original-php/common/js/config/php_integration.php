<?php
/**
 * 🚀 JavaScript自動ローダー PHP統合 (既存システム完全保護版)
 * 
 * 【統合方針】
 * - 既存JavaScript読み込みコード完全保持
 * - 新システムは追加のみ
 * - 段階的有効化対応
 * - 即座復旧可能
 */

// =====================================
// 【重要】既存システム（変更禁止・そのまま保持）
// =====================================

// kicho_contentページの既存読み込み（そのまま保持）
if ($page === 'kicho_content' && file_exists('common/js/pages/kicho.js')) {
    echo '<script src="common/js/pages/kicho.js"></script>' . "\n";
    echo '<script src="common/claude_universal_hooks/js/hooks/kicho_hooks_engine.js"></script>' . "\n";
}

// dashboard ページの既存読み込み（そのまま保持）
if ($page === 'dashboard' && file_exists('common/js/pages/dashboard.js')) {
    echo '<script src="common/js/pages/dashboard.js"></script>' . "\n";
}

// zaiko_content ページの既存読み込み（そのまま保持）
if ($page === 'zaiko_content' && file_exists('common/js/pages/zaiko.js')) {
    echo '<script src="common/js/pages/zaiko.js"></script>' . "\n";
}

// 他の既存ページも同様に保持...
// （既存のJavaScript読み込みコードをここに追加）

// =====================================
// 新システム（追加のみ・既存に影響なし）
// =====================================

// 段階的有効化設定の読み込み
$js_auto_loader_config = [];
if (file_exists('config/js_auto_loader.php')) {
    include_once 'config/js_auto_loader.php';
}

// デフォルト設定（安全な無効状態）
$js_auto_loader_enabled = defined('JS_AUTO_LOADER_ENABLED') ? JS_AUTO_LOADER_ENABLED : false;
$js_auto_loader_test_pages = defined('JS_AUTO_LOADER_TEST_PAGES') ? JS_AUTO_LOADER_TEST_PAGES : [];
$js_auto_loader_all_pages = defined('JS_AUTO_LOADER_ALL_PAGES') ? JS_AUTO_LOADER_ALL_PAGES : false;

// 現在のページが対象かチェック
$auto_loader_should_run = false;
if ($js_auto_loader_enabled) {
    if ($js_auto_loader_all_pages) {
        $auto_loader_should_run = true;
    } elseif (in_array($page, $js_auto_loader_test_pages)) {
        $auto_loader_should_run = true;
    }
}

?>

<!-- JavaScript自動ローダーシステム (新規追加) -->
<!-- 設定ファイル読み込み -->
<script src="common/js/core/js_auto_config.js"></script>

<!-- ローダー本体読み込み -->
<script src="common/js/core/js_auto_loader.js"></script>

<!-- 自動ローダー初期化・実行 -->
<script>
(function() {
    'use strict';
    
    // PHP から JavaScript への設定受け渡し
    window.JS_AUTO_LOADER_PHP_CONFIG = {
        enabled: <?php echo $js_auto_loader_enabled ? 'true' : 'false'; ?>,
        shouldRun: <?php echo $auto_loader_should_run ? 'true' : 'false'; ?>,
        currentPage: '<?php echo htmlspecialchars($page, ENT_QUOTES, 'UTF-8'); ?>',
        testPages: <?php echo json_encode($js_auto_loader_test_pages); ?>,
        allPages: <?php echo $js_auto_loader_all_pages ? 'true' : 'false'; ?>
    };
    
    // デバッグ情報
    console.log('🔧 JS Auto Loader PHP Config:', window.JS_AUTO_LOADER_PHP_CONFIG);
    
    // 自動ローダー実行判定
    if (window.JS_AUTO_LOADER_PHP_CONFIG.shouldRun) {
        console.log('🚀 JS Auto Loader: Enabled for current page');
        
        // DOM読み込み完了後に実行
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // 設定検証
                if (typeof window.JS_AUTO_CONFIG === 'undefined') {
                    throw new Error('JS_AUTO_CONFIG not loaded');
                }
                
                if (typeof window.JSAutoLoader === 'undefined') {
                    throw new Error('JSAutoLoader class not loaded');
                }
                
                // 設定検証実行
                if (!window.JS_AUTO_CONFIG.validate()) {
                    throw new Error('JS_AUTO_CONFIG validation failed');
                }
                
                // 自動ローダーインスタンス作成
                const autoLoader = new JSAutoLoader();
                
                // ページ用JavaScript読み込み実行
                const startTime = performance.now();
                await autoLoader.loadForPage(window.JS_AUTO_LOADER_PHP_CONFIG.currentPage);
                const endTime = performance.now();
                
                // 成功ログ
                console.log('✅ JS Auto Loader: Success');
                console.log(`⏱️ Load time: ${(endTime - startTime).toFixed(2)}ms`);
                
                // 読み込み統計
                const status = autoLoader.getStatus();
                console.log('📊 Loaded files:', status.fileCount);
                
                // カスタムイベント発行 (他のスクリプトでの利用用)
                const event = new CustomEvent('jsAutoLoaderComplete', {
                    detail: {
                        page: window.JS_AUTO_LOADER_PHP_CONFIG.currentPage,
                        loadTime: endTime - startTime,
                        fileCount: status.fileCount,
                        files: status.loadedFiles
                    }
                });
                document.dispatchEvent(event);
                
            } catch (error) {
                // エラーハンドリング（既存システムに影響なし）
                console.warn('⚠️ JS Auto Loader: Failed, existing system continues', error);
                
                // エラー詳細ログ (開発モード時のみ)
                if (window.JS_AUTO_CONFIG && window.JS_AUTO_CONFIG.settings.developmentMode) {
                    console.error('JS Auto Loader Error Details:', {
                        message: error.message,
                        stack: error.stack,
                        config: window.JS_AUTO_LOADER_PHP_CONFIG
                    });
                }
                
                // エラーイベント発行
                const errorEvent = new CustomEvent('jsAutoLoaderError', {
                    detail: {
                        error: error.message,
                        page: window.JS_AUTO_LOADER_PHP_CONFIG.currentPage
                    }
                });
                document.dispatchEvent(errorEvent);
            }
        });
        
    } else {
        // 無効時のログ
        if (window.JS_AUTO_LOADER_PHP_CONFIG.enabled) {
            console.log('📋 JS Auto Loader: Enabled but not for current page');
        } else {
            console.log('📋 JS Auto Loader: Disabled, using existing system');
        }
    }
    
})();
</script>

<!-- 開発者向けデバッグツール -->
<?php if (defined('JS_AUTO_LOADER_DEBUG') && JS_AUTO_LOADER_DEBUG): ?>
<script>
// デバッグモード専用機能
window.jsAutoLoaderDebug = {
    // ローダー状態確認
    getStatus: function() {
        if (window.jsAutoLoaderInstance) {
            return window.jsAutoLoaderInstance.getStatus();
        }
        return { error: 'Loader not initialized' };
    },
    
    // 手動ページロード
    loadPage: function(pageName) {
        if (window.JSAutoLoader) {
            const loader = new JSAutoLoader();
            return loader.loadForPage(pageName);
        }
        return Promise.reject('JSAutoLoader not available');
    },
    
    // 設定確認
    getConfig: function() {
        return {
            php: window.JS_AUTO_LOADER_PHP_CONFIG,
            js: window.JS_AUTO_CONFIG
        };
    },
    
    // 統計情報
    getStats: function() {
        const scripts = document.querySelectorAll('script[src]');
        return {
            totalScripts: scripts.length,
            autoLoaderScripts: window.jsAutoLoaderInstance ? 
                window.jsAutoLoaderInstance.getStatus().fileCount : 0,
            scriptSources: Array.from(scripts).map(s => s.src)
        };
    }
};

console.log('🔍 Debug mode enabled. Use window.jsAutoLoaderDebug for debugging.');
</script>
<?php endif; ?>

<!-- 緊急無効化スイッチ -->
<script>
// 緊急時の完全無効化 (window.JS_AUTO_LOADER_EMERGENCY_DISABLE = true)
if (typeof window.JS_AUTO_LOADER_EMERGENCY_DISABLE !== 'undefined' && 
    window.JS_AUTO_LOADER_EMERGENCY_DISABLE === true) {
    
    console.warn('🚨 JS Auto Loader: Emergency disable activated');
    
    // 既存の設定を無効化
    window.JS_AUTO_LOADER_PHP_CONFIG = { 
        enabled: false, 
        shouldRun: false,
        emergencyDisabled: true 
    };
}
</script>

<?php
/**
 * 段階的有効化用設定ファイル例
 * config/js_auto_loader.php として作成
 * 
 * <?php
 * // Phase 1: 完全無効（既存システムのみ）
 * define('JS_AUTO_LOADER_ENABLED', false);
 * 
 * // Phase 2: 特定ページのみテスト
 * // define('JS_AUTO_LOADER_ENABLED', true);
 * // define('JS_AUTO_LOADER_TEST_PAGES', ['test_page', 'new_page']);
 * 
 * // Phase 3: 段階拡大
 * // define('JS_AUTO_LOADER_ENABLED', true);
 * // define('JS_AUTO_LOADER_TEST_PAGES', ['test_page', 'dashboard', 'report']);
 * 
 * // Phase 4: 全面移行
 * // define('JS_AUTO_LOADER_ENABLED', true);
 * // define('JS_AUTO_LOADER_ALL_PAGES', true);
 * 
 * // デバッグモード (開発時のみ)
 * // define('JS_AUTO_LOADER_DEBUG', true);
 * ?>
 */

/**
 * 緊急復旧手順
 * 
 * 1. 即座無効化:
 *    config/js_auto_loader.php で define('JS_AUTO_LOADER_ENABLED', false);
 * 
 * 2. JavaScript無効化:
 *    HTML内で window.JS_AUTO_LOADER_EMERGENCY_DISABLE = true;
 * 
 * 3. ファイル削除復旧:
 *    rm common/js/core/js_auto_loader.js
 *    rm common/js/core/js_auto_config.js
 * 
 * 4. 設定ファイル削除:
 *    rm config/js_auto_loader.php
 */

/**
 * 実装時のテスト手順
 * 
 * 1. Phase 1 テスト:
 *    - JS_AUTO_LOADER_ENABLED = false
 *    - 既存システムが正常動作することを確認
 * 
 * 2. Phase 2 テスト:
 *    - JS_AUTO_LOADER_ENABLED = true
 *    - JS_AUTO_LOADER_TEST_PAGES = ['test_page']
 *    - test_page でのみ動作確認
 * 
 * 3. Phase 3 テスト:
 *    - 対象ページを段階的に拡大
 *    - 各ページで動作確認
 * 
 * 4. Phase 4 本番:
 *    - JS_AUTO_LOADER_ALL_PAGES = true
 *    - 全ページで動作確認
 */
?>
