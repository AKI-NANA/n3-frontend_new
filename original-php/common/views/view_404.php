<?php
/**
 * 404エラーページ - 存在しないURLにアクセスした場合
 * template_layout_basic.php で読み込まれる
 */

// ログ記録
require_once __DIR__ . '/../Logger.php';

// 404エラーをログに記録
Logger::warning('404エラー', [
    'requested_url' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'referer' => $_SERVER['HTTP_REFERER'] ?? 'direct',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>

<div class="error-container">
    <!-- エラーコード -->
    <h1 class="error-code">404</h1>
    
    <!-- エラータイトル -->
    <h2 class="error-title">ページが見つかりません</h2>
    
    <!-- エラー説明 -->
    <div class="error-description">
        <p>お探しのページは存在しないか、移動・削除された可能性があります。</p>
        <p>URLをご確認いただくか、以下のボタンから他のページにお進みください。</p>
    </div>
    
    <!-- アクションボタン -->
    <div class="error-actions">
        <a href="/?page=dashboard" class="error-btn error-btn--primary">
            <i class="fas fa-home"></i>
            ダッシュボードに戻る
        </a>
        <button onclick="goBack()" class="error-btn error-btn--secondary">
            <i class="fas fa-arrow-left"></i>
            前のページに戻る
        </button>
    </div>
    
    <!-- 追加情報（開発者・管理者向け） -->
    <?php if (isset($_SESSION['user']) && $_SESSION['user']['role'] === 'admin'): ?>
    <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); text-align: left;">
        <h4 style="margin: 0 0 0.5rem 0; color: var(--text-secondary); font-size: 0.875rem;">管理者向け情報:</h4>
        <p style="margin: 0; font-size: 0.75rem; color: var(--text-tertiary); font-family: monospace;">
            要求URL: <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'unknown'); ?><br>
            リファラー: <?php echo htmlspecialchars($_SERVER['HTTP_REFERER'] ?? 'direct access'); ?><br>
            タイムスタンプ: <?php echo date('Y-m-d H:i:s'); ?>
        </p>
    </div>
    <?php endif; ?>
</div>

<!-- 素人でもテストできるように：表示確認用コメント -->
<!-- 
🧪 テスト方法:
1. ブラウザで http://localhost/存在しないページ にアクセス
2. この404画面が表示されることを確認
3. 「ダッシュボードに戻る」ボタンが動作することを確認
4. 「前のページに戻る」ボタンが動作することを確認

✅ 正常に動作している場合:
- 大きく「404」が表示される
- 「ページが見つかりません」というタイトルが表示される
- 2つのボタンが表示される
- 管理者でログインしている場合は追加情報も表示される
-->