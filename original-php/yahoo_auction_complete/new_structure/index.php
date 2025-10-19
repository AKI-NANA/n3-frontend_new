<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAGANO-3 サーバーテスト</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 5px solid #059669; }
        .info { background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 5px solid #3b82f6; }
        .test-item { background: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 5px; }
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="success">
        <h1>🎉 NAGANO-3 PHPサーバー稼働中！</h1>
        <p>現在時刻: <?php echo date('Y-m-d H:i:s'); ?></p>
        <p>PHPバージョン: <?php echo phpversion(); ?></p>
        <p>サーバー情報: <?php echo $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']; ?></p>
    </div>

    <div class="info">
        <h2>📋 システムリンク一覧</h2>
        
        <div class="test-item">
            <h3>🎮 メインダッシュボード</h3>
            <a href="00_workflow_engine/dashboard_v2_integrated.html">統合監視ダッシュボード</a>
        </div>

        <div class="test-item">
            <h3>📚 使い方マニュアル</h3>
            <a href="00_workflow_engine/USER_MANUAL.html">ユーザーマニュアル</a>
        </div>

        <div class="test-item">
            <h3>🔧 各システム</h3>
            <a href="02_scraping/scraping.php">スクレイピング</a> | 
            <a href="03_approval/">承認システム</a> | 
            <a href="05_rieki/advanced_tariff_calculator.php">利益計算</a> | 
            <a href="08_listing/">出品システム</a>
        </div>

        <div class="test-item">
            <h3>🩺 ヘルスチェック</h3>
            <a href="00_workflow_engine/integrated_workflow_engine_8080.php?action=health_check">ワークフローエンジン状態</a>
        </div>
    </div>

    <div class="info">
        <h2>🔍 システム情報</h2>
        <p><strong>プロジェクトパス:</strong> <?php echo __DIR__; ?></p>
        <p><strong>現在のURL:</strong> http://<?php echo $_SERVER['HTTP_HOST']; ?></p>
        <p><strong>PostgreSQL接続:</strong> 
        <?php
        try {
            $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
            echo "<span style='color: green;'>✅ 接続OK</span>";
        } catch (Exception $e) {
            echo "<span style='color: red;'>❌ 接続エラー</span>";
        }
        ?>
        </p>
    </div>
</body>
</html>