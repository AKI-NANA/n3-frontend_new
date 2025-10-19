<?php
/**
 * 500エラーページ - サーバーエラー・例外発生時
 * template_layout_basic.php で読み込まれる
 */

// ログ記録
require_once __DIR__ . '/../Logger.php';

// エラー詳細を取得（設定されている場合）
$error_message = $error_details['message'] ?? 'システム内部でエラーが発生しました';
$error_code = $error_details['code'] ?? 500;
$error_file = $error_details['file'] ?? 'unknown';
$error_line = $error_details['line'] ?? 'unknown';

// 500エラーをログに記録
Logger::error('500エラー表示', [
    'error_message' => $error_message,
    'error_code' => $error_code,
    'error_file' => $error_file,
    'error_line' => $error_line,
    'requested_url' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_id' => $_SESSION['user']['id'] ?? 'guest',
    'timestamp' => date('Y-m-d H:i:s')
]);

// エラーID生成（サポート用）
$error_id = 'ERR-' . date('Ymd-His') . '-' . substr(md5(uniqid()), 0, 6);
?>

<div class="error-container">
    <!-- エラーコード -->
    <h1 class="error-code">500</h1>
    
    <!-- エラータイトル -->
    <h2 class="error-title">システムエラーが発生しました</h2>
    
    <!-- エラー説明 -->
    <div class="error-description">
        <p>申し訳ございません。システムで一時的な問題が発生しました。</p>
        <p>しばらく時間をおいて再度お試しください。</p>
        <p>問題が解決しない場合は、以下のエラーIDをお控えの上、サポートまでお問い合わせください。</p>
    </div>
    
    <!-- エラーID表示 -->
    <div style="margin: 1.5rem 0; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border-left: 4px solid var(--accent-orange);">
        <p style="margin: 0; font-weight: 600; color: var(--text-primary);">
            <i class="fas fa-id-card" style="margin-right: 0.5rem; color: var(--accent-orange);"></i>
            エラーID: <code style="background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: monospace;"><?php echo $error_id; ?></code>
        </p>
    </div>
    
    <!-- アクションボタン -->
    <div class="error-actions">
        <a href="/?page=dashboard" class="error-btn error-btn--primary">
            <i class="fas fa-home"></i>
            ダッシュボードに戻る
        </a>
        <button onclick="reloadPage()" class="error-btn error-btn--secondary">
            <i class="fas fa-refresh"></i>
            ページを再読み込み
        </button>
    </div>
    
    <!-- 開発・デバッグ情報（管理者のみ） -->
    <?php if (isset($_SESSION['user']) && $_SESSION['user']['role'] === 'admin' && ($_ENV['APP_ENV'] ?? 'production') !== 'production'): ?>
    <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); text-align: left; border-left: 4px solid var(--accent-red);">
        <h4 style="margin: 0 0 0.5rem 0; color: var(--accent-red); font-size: 0.875rem;">
            <i class="fas fa-bug"></i> 開発者向けデバッグ情報:
        </h4>
        <div style="font-size: 0.75rem; color: var(--text-tertiary); font-family: monospace; line-height: 1.4;">
            <strong>エラーメッセージ:</strong> <?php echo htmlspecialchars($error_message); ?><br>
            <strong>ファイル:</strong> <?php echo htmlspecialchars($error_file); ?><br>
            <strong>行番号:</strong> <?php echo htmlspecialchars($error_line); ?><br>
            <strong>要求URL:</strong> <?php echo htmlspecialchars($_SERVER['REQUEST_URI'] ?? 'unknown'); ?><br>
            <strong>タイムスタンプ:</strong> <?php echo date('Y-m-d H:i:s'); ?><br>
            <strong>エラーID:</strong> <?php echo $error_id; ?>
        </div>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">
            ⚠️ この情報は本番環境では表示されません
        </p>
    </div>
    <?php endif; ?>
</div>

<!-- 素人でもテストできるように：表示確認用コメント -->
<!-- 
🧪 テスト方法:
1. controllers/controller_dashboard_status.php の先頭に以下を追加:
   throw new Exception("テスト用エラー");

2. ブラウザで http://localhost/controllers/controller_dashboard_status.php にアクセス

3. この500エラー画面が表示されることを確認

4. ✅ 正常に動作している場合:
   - 大きく「500」が表示される
   - 「システムエラーが発生しました」というタイトルが表示される
   - エラーIDが表示される（ERR-20250603-142530-a1b2c3 のような形式）
   - 2つのボタンが表示される
   - 管理者でログインしている場合はデバッグ情報も表示される

5. ⚠️ テスト後は必ず throw new Exception("テスト用エラー"); を削除すること

🔧 ログ確認方法:
- Logger.php で設定されたログファイルにエラー詳細が記録される
- 管理者は /admin/logs などで確認可能（将来実装）
-->