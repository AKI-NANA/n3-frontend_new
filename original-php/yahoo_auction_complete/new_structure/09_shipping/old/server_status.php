<?php
/**
 * 簡易デバッグページ
 */
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>送料計算システム - サーバー確認</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8fafc;
        }
        .info-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-ok { color: #10b981; }
        .file-list {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 15px;
            font-family: monospace;
            font-size: 14px;
            max-height: 300px;
            overflow-y: auto;
        }
        .link-btn {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            margin: 5px;
        }
        .link-btn:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <div class="info-card">
        <h1>🚢 送料計算システム - サーバー情報</h1>
        <div class="status-ok">✅ PHPサーバーが正常に動作しています</div>
    </div>

    <div class="info-card">
        <h2>サーバー情報</h2>
        <ul>
            <li><strong>現在のディレクトリ:</strong> <?= __DIR__ ?></li>
            <li><strong>PHPバージョン:</strong> <?= phpversion() ?></li>
            <li><strong>サーバー時刻:</strong> <?= date('Y-m-d H:i:s') ?></li>
            <li><strong>メモリ使用量:</strong> <?= memory_get_usage(true) / 1024 / 1024 ?>MB</li>
        </ul>
    </div>

    <div class="info-card">
        <h2>ファイル一覧（HTMLファイル）</h2>
        <div class="file-list">
<?php
$files = glob('*.html');
foreach ($files as $file) {
    $size = filesize($file);
    $modified = date('Y-m-d H:i:s', filemtime($file));
    echo "📄 {$file} ({$size} bytes, {$modified})\n";
}
?>
        </div>
    </div>

    <div class="info-card">
        <h2>アクセス可能なファイル</h2>
        <?php
        $htmlFiles = glob('*.html');
        foreach ($htmlFiles as $file) {
            echo "<a href=\"{$file}\" class=\"link-btn\" target=\"_blank\">{$file}</a>";
        }
        ?>
        
        <br><br>
        
        <a href="enhanced_calculation_php_fixed.php" class="link-btn" target="_blank">enhanced_calculation_php_fixed.php</a>
        <a href="api/database_viewer.php" class="link-btn" target="_blank">API Viewer</a>
    </div>

    <div class="info-card">
        <h2>データベース接続テスト</h2>
        <?php
        try {
            $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
            echo '<div class="status-ok">✅ データベース接続成功</div>';
            
            // レコード数確認
            $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates");
            $count = $stmt->fetchColumn();
            echo "<p>送料データ: {$count}件</p>";
            
        } catch (PDOException $e) {
            echo '<div style="color: #ef4444;">❌ データベース接続失敗: ' . htmlspecialchars($e->getMessage()) . '</div>';
        }
        ?>
    </div>
</body>
</html>