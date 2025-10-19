<?php
/**
 * Yahoo Auction Tool - メインツール（統合版）
 * 全機能を統合したメインシステム
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// メインツールの実際のファイルをインクルード
$main_tool_file = __DIR__ . '/yahoo_auction_tool_content.php';

if (file_exists($main_tool_file)) {
    include $main_tool_file;
} else {
    echo '<div class="error-message">メインツールファイルが見つかりません。</div>';
}
?>