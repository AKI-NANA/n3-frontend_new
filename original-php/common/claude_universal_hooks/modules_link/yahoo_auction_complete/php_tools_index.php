<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Complete - PHP版ツール</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
        .link-box { background: #e7f3ff; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007cba; }
        .link-box a { color: #007cba; text-decoration: none; font-weight: bold; }
        .link-box a:hover { text-decoration: underline; }
        .status { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 20px 0; }
        .test-links { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Yahoo Auction Complete - PHP版ツール</h1>
        
        <div class="status">
            ✅ サーバー動作中: <?php echo date('Y-m-d H:i:s'); ?>
        </div>

        <h2>🧪 動作テスト（まずこちらで確認）</h2>
        <div class="test-links">
            <div class="link-box">
                <a href="test_php.php">PHP基本動作テスト</a>
                <p>PHPが正常に動作するかテスト</p>
            </div>
            <div class="link-box">
                <a href="new_structure/test_new_structure.php">new_structure動作テスト</a>
                <p>new_structureディレクトリ内のPHP動作テスト</p>
            </div>
        </div>

        <h2>🛠️ PHP版ツール（高機能版）</h2>
        
        <div class="link-box">
            <a href="new_structure/advanced_tools_php_index.php">📊 PHP版ツール統合インデックス</a>
            <p>全てのPHP版ツールへの統合アクセスポイント</p>
        </div>
        
        <div class="link-box">
            <a href="new_structure/05_rieki/advanced_tariff_calculator.php">🧮 高度統合利益計算システム</a>
            <p>eBay USA & Shopee 7カ国対応・関税・DDP/DDU完全対応</p>
        </div>
        
        <div class="link-box">
            <a href="new_structure/09_shipping/complete_4layer_shipping_ui.php">🚢 送料計算システム（4層選択）</a>
            <p>全業者対応・30kg対応・実データベース連携</p>
        </div>
        
        <div class="link-box">
            <a href="new_structure/05_rieki/working_calculator.php">⚡ 高速動作版利益計算</a>
            <p>HTTP通信問題回避版・即座に利用可能</p>
        </div>

        <h2>🔗 既存システム</h2>
        
        <div class="link-box">
            <a href="yahoo_auction_complete_24tools.html">🏠 24ツール統合システム（既存）</a>
            <p>従来のHTMLベースシステム</p>
        </div>
        
        <div class="link-box">
            <a href="index.php">📱 メインダッシュボード</a>
            <p>システム全体の管理画面</p>
        </div>

        <h2>🔧 システム情報</h2>
        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
        <p><strong>Server Time:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
        <p><strong>Document Root:</strong> <?php echo $_SERVER['DOCUMENT_ROOT'] ?? __DIR__; ?></p>
        <p><strong>Server URL:</strong> http://localhost:8080</p>
    </div>
</body>
</html>
