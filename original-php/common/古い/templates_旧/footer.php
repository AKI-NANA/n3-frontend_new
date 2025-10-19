<?php
/**
 * NAGANO-3 統合フッターテンプレート（デバッグボタン自動配置版）
 * common/templates/footer.php
 * 
 * 🎯 機能:
 * ✅ 全ページ共通フッター
 * ✅ デバッグボタン自動配置
 * ✅ 開発環境判定
 * ✅ ページ別デバッグパネル自動振り分け
 */

// 現在のページ取得
$current_page = $_GET['page'] ?? 'dashboard';

// 開発環境判定
$is_development = in_array($_SERVER['HTTP_HOST'] ?? '', [
    'localhost', 
    '127.0.0.1', 
    'dev.nagano3.com'
]);

// デバッグボタン表示判定
$show_debug_button = $is_development || 
                    (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') ||
                    (isset($_GET['debug']) && $_GET['debug'] === '1');
?>

<!-- スクロールトップボタン -->
<button class="scroll-to-top" 
        x-data="{ visible: false }" 
        x-init="
            const handleScroll = () => { 
                visible = window.pageYOffset > 300; 
            };
            window.addEventListener('scroll', handleScroll);
        "
        x-show="visible" 
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0 scale-75"
        x-transition:enter-end="opacity-100 scale-100"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100 scale-100"
        x-transition:leave-end="opacity-0 scale-75"
        @click="window.scrollTo({top: 0, behavior: 'smooth'})"
        style="position: fixed; bottom: 80px; right: 20px; z-index: 1000; background: #6b7280; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2);"
        title="ページトップへ戻る">
    <i class="fas fa-arrow-up"></i>
</button>

<?php if ($show_debug_button): ?>
<!-- 🔧 デバッグボタン（全ページ自動配置） -->
<div id="nagano3-debug-trigger" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999999;">
    <a href="/debug/debug_loader.php?source=<?= urlencode($current_page) ?>" 
       target="_blank"
       title="<?= htmlspecialchars($current_page) ?> 専用デバッグパネルを開く"
       style="display: inline-block; background: #28a745; color: white; padding: 12px; border: none; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-decoration: none; transition: all 0.3s ease;">
        <i class="fas fa-bug" style="font-size: 18px;"></i>
    </a>
</div>

<!-- デバッグボタンホバー効果 -->
<style>
#nagano3-debug-trigger a:hover {
    background: #34ce57 !important;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 16px rgba(0,0,0,0.4) !important;
}

#nagano3-debug-trigger a:active {
    transform: translateY(0) scale(0.95);
}

/* デバッグボタンのページ別色分け */
<?php 
$page_colors = [
    'kicho_content' => '#28a745',      // 緑 - 記帳
    'apikey_content' => '#007bff',     // 青 - APIキー
    'dashboard' => '#6f42c1',          // 紫 - ダッシュボード
    'shohin_content' => '#fd7e14',     // オレンジ - 商品
    'zaiko_content' => '#20c997',      // ティール - 在庫
    'juchu_content' => '#e83e8c'       // ピンク - 受注
];

$current_color = $page_colors[$current_page] ?? '#28a745';
?>

#nagano3-debug-trigger a {
    background: <?= $current_color ?> !important;
}

<?php 
// ページ別のアイコン色調整
$icon_brightness = [
    'kicho_content' => '1.0',
    'apikey_content' => '1.1', 
    'dashboard' => '1.2',
    'shohin_content' => '0.9',
    'zaiko_content' => '1.0',
    'juchu_content' => '1.1'
];

$current_brightness = $icon_brightness[$current_page] ?? '1.0';
?>

#nagano3-debug-trigger i {
    filter: brightness(<?= $current_brightness ?>);
}

/* 開発環境での追加表示 */
<?php if ($is_development): ?>
#nagano3-debug-trigger::before {
    content: "DEV";
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ff4444;
    color: white;
    font-size: 8px;
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 3px;
    pointer-events: none;
    z-index: 10;
}
<?php endif; ?>
</style>

<!-- デバッグボタン用JavaScript -->
<script>
// デバッグボタン機能拡張
document.addEventListener('DOMContentLoaded', function() {
    const debugButton = document.getElementById('nagano3-debug-trigger');
    
    if (debugButton) {
        // 右クリックで緊急デバッグモード
        debugButton.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            
            if (confirm('🚨 緊急デバッグモードを起動しますか？\n（専用パネルが利用できない場合のフォールバック）')) {
                window.open('/debug/debug_loader.php?source=emergency&page=<?= urlencode($current_page) ?>', '_blank');
            }
        });
        
        // ダブルクリックでコンソールデバッグ
        debugButton.addEventListener('dblclick', function(e) {
            e.preventDefault();
            
            console.group('🔧 NAGANO-3 クイックデバッグ');
            console.log('📄 現在ページ:', '<?= $current_page ?>');
            console.log('🌐 URL:', window.location.href);
            console.log('🔗 NAGANO3:', typeof window.NAGANO3 !== 'undefined' ? '利用可能' : '未読み込み');
            console.log('💾 Memory:', (performance.memory?.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB' || 'N/A');
            console.log('📱 画面:', window.innerWidth + 'x' + window.innerHeight);
            console.groupEnd();
            
            alert('🔧 コンソールにデバッグ情報を出力しました\n（F12キーでデベロッパーツールを開いて確認してください）');
        });
        
        console.log('🔧 デバッグボタン配置完了: <?= $current_page ?>');
    }
});
</script>
<?php endif; ?>

<!-- メインフッター -->
<footer class="footer" style="background: #f8f9fa; border-top: 1px solid #e9ecef; padding: 15px 0; text-align: center; margin-top: 50px; z-index: 100; position: relative;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
            &copy; <?php echo date('Y'); ?> NAGANO-3 統合管理システム. All rights reserved.
            <?php if ($is_development): ?>
                <span style="color: #ff4444; font-weight: bold;">【開発環境】</span>
            <?php endif; ?>
        </p>
        
        <?php if ($show_debug_button): ?>
        <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">
            <i class="fas fa-bug" style="color: <?= $current_color ?>; margin-right: 5px;"></i>
            <?= htmlspecialchars($current_page) ?> 専用デバッグパネル利用可能
            <span style="color: #ccc;">（右下ボタンクリック）</span>
        </p>
        <?php endif; ?>
    </div>
</footer>

<!-- Alpine.js用グローバルユーティリティ -->
<script>
document.addEventListener('alpine:init', () => {
    console.log('✅ NAGANO-3 フッターテンプレート初期化完了');
    <?php if ($show_debug_button): ?>
    console.log('🔧 デバッグモード有効 - ページ: <?= $current_page ?>');
    <?php endif; ?>
});
</script>

</body>
</html>