<?php
/**
 * NAGANO-3 記帳ツールマニュアル
 */

// 直接アクセスの場合は共通セキュリティ設定を読み込む
if (basename($_SERVER['SCRIPT_NAME']) === basename(__FILE__)) {
    require_once __DIR__ . '/../../common/includes/security.php';
    require_once __DIR__ . '/../../common/includes/navigation.php';
    
    // システム初期化
    initializeSystem();
    
    // ヘッダー出力
    ?>
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>💰 記帳ツールマニュアル - NAGANO-3</title>
        <link rel="stylesheet" href="/common/css/style.css">
        <link rel="stylesheet" href="/modules/manual/manual_style.css">
    </head>
    <body class="manual-system">
        <div class="container">
            <header class="header">
                <h1>💰 記帳ツールマニュアル</h1>
                <p>NAGANO-3 記帳管理システム</p>
            </header>
            
            <?php
            renderNavigation('kicho');
            
            // パンくずリスト
            $breadcrumbs = [
                ['url' => '/index.php', 'text' => 'ホーム'],
                ['url' => '/modules/manual/manual_main_page.php', 'text' => 'マニュアル'],
                ['url' => '#', 'text' => '記帳ツール']
            ];
            renderBreadcrumbs($breadcrumbs);
            ?>
            
            <main class="main-content">
    <?php
}

// メインコンテンツ
?>
<div class="manual-category">
    <h2>💰 記帳ツールマニュアル</h2>
    <div class="manual-grid">
        <div class="manual-card">
            <h3>🚀 はじめての記帳</h3>
            <p>記帳ツールの基本的な使い方</p>
            <a href="?page=view&manual=kicho_basic" class="btn btn-primary">マニュアルを見る</a>
        </div>
        <div class="manual-card">
            <h3>📤 CSVファイル取り込み</h3>
            <p>銀行やクレジットカードのデータ取り込み</p>
            <a href="?page=view&manual=kicho_csv_import" class="btn btn-primary">準備中</a>
        </div>
    </div>
</div>

<?php
// 直接アクセスの場合はフッターを出力
if (basename($_SERVER['SCRIPT_NAME']) === basename(__FILE__)) {
    ?>
            </main>
            <footer class="footer">
                <p>&copy; 2025 NAGANO-3 システム</p>
            </footer>
        </div>
    </body>
    </html>
    <?php
} 