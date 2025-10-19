<?php
/**
 * PHP環境テスト・診断ファイル
 * ブラウザで直接アクセスして動作確認
 */

header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP環境テスト</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
        .success { color: #00ff00; }
        .warning { color: #ffff00; }
        .error { color: #ff0000; }
        .info { color: #00aaff; }
        h1, h2 { color: #ffffff; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #333; border-radius: 5px; }
        pre { background: #2a2a2a; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 PHP環境診断レポート</h1>
    
    <div class="section">
        <h2>📋 基本情報</h2>
        <p class="info">現在時刻: <?php echo date('Y-m-d H:i:s'); ?></p>
        <p class="success">✅ PHP動作確認: OK</p>
        <p class="info">PHPバージョン: <?php echo phpversion(); ?></p>
        <p class="info">サーバー情報: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'PHP Built-in Server'; ?></p>
        <p class="info">ドキュメントルート: <?php echo $_SERVER['DOCUMENT_ROOT'] ?? getcwd(); ?></p>
    </div>

    <div class="section">
        <h2>📁 ファイル確認</h2>
        <?php
        $requiredFiles = [
            'advanced_tariff_calculator.html',
            'advanced_tariff_api.php',
            'index.html'
        ];
        
        foreach ($requiredFiles as $file) {
            if (file_exists($file)) {
                echo "<p class='success'>✅ {$file} - 存在します (" . number_format(filesize($file)) . " bytes)</p>";
            } else {
                echo "<p class='error'>❌ {$file} - 見つかりません</p>";
            }
        }
        ?>
    </div>

    <div class="section">
        <h2>🔧 PHP拡張モジュール</h2>
        <?php
        $requiredExtensions = ['curl', 'json', 'pdo', 'pdo_pgsql'];
        
        foreach ($requiredExtensions as $ext) {
            if (extension_loaded($ext)) {
                echo "<p class='success'>✅ {$ext} - インストール済み</p>";
            } else {
                echo "<p class='warning'>⚠️  {$ext} - 未インストール</p>";
            }
        }
        ?>
    </div>

    <div class="section">
        <h2>🌐 サーバー設定</h2>
        <p class="info">現在のURL: <?php echo "http://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}"; ?></p>
        <p class="info">アクセス方法:</p>
        <ul>
            <li><a href="http://<?php echo $_SERVER['HTTP_HOST']; ?>/" style="color: #00aaff;">http://<?php echo $_SERVER['HTTP_HOST']; ?>/</a> (メインメニュー)</li>
            <li><a href="http://<?php echo $_SERVER['HTTP_HOST']; ?>/advanced_tariff_calculator.html" style="color: #00aaff;">http://<?php echo $_SERVER['HTTP_HOST']; ?>/advanced_tariff_calculator.html</a> (利益計算システム)</li>
        </ul>
    </div>

    <div class="section">
        <h2>🧪 API動作テスト</h2>
        <?php
        echo "<p class='info'>テスト実行中...</p>";
        
        // 1. 簡単なAPIテスト
        echo "<h3>1. 簡単なAPIテスト</h3>";
        try {
            $testUrl = "http://{$_SERVER['HTTP_HOST']}/api_test.php?action=test";
            $context = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'method' => 'GET'
                ]
            ]);
            
            $response = @file_get_contents($testUrl, false, $context);
            
            if ($response) {
                $data = json_decode($response, true);
                if ($data && isset($data['success']) && $data['success']) {
                    echo "<p class='success'>✅ 簡単なAPIテスト: OK</p>";
                } else {
                    echo "<p class='warning'>⚠️  簡単なAPI応答エラー</p>";
                    echo "<pre>" . htmlspecialchars($response) . "</pre>";
                }
            } else {
                echo "<p class='error'>❌ 簡単なAPI接続失敗</p>";
            }
        } catch (Exception $e) {
            echo "<p class='error'>❌ 簡単なAPIテストエラー: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        
        // 2. 為替レートAPIテスト
        echo "<h3>2. 為替レートAPIテスト</h3>";
        try {
            $testUrl = "http://{$_SERVER['HTTP_HOST']}/api_test.php?action=get_exchange_rates";
            $response = @file_get_contents($testUrl, false, $context);
            
            if ($response) {
                $data = json_decode($response, true);
                if ($data && isset($data['success']) && $data['success']) {
                    echo "<p class='success'>✅ 為替レートAPI: OK</p>";
                    echo "<p class='info'>USD/JPY: {$data['rates']['USD_JPY']}</p>";
                } else {
                    echo "<p class='warning'>⚠️  為替レートAPI応答エラー</p>";
                }
            } else {
                echo "<p class='error'>❌ 為替レートAPI接続失敗</p>";
            }
        } catch (Exception $e) {
            echo "<p class='error'>❌ 為替レートAPIテストエラー: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        
        // 3. メインAPIテスト
        echo "<h3>3. メインAPIテスト</h3>";
        if (file_exists('advanced_tariff_api.php')) {
            try {
                $testUrl = "http://{$_SERVER['HTTP_HOST']}/advanced_tariff_api.php?action=get_exchange_rates";
                $response = @file_get_contents($testUrl, false, $context);
                
                if ($response) {
                    $data = json_decode($response, true);
                    if ($data && isset($data['success']) && $data['success']) {
                        echo "<p class='success'>✅ メインAPI動作確認: OK</p>";
                        echo "<p class='info'>為替レート取得: 成功</p>";
                    } else {
                        echo "<p class='warning'>⚠️  メインAPI応答エラー</p>";
                        echo "<pre>" . htmlspecialchars($response) . "</pre>";
                    }
                } else {
                    echo "<p class='error'>❌ メインAPI接続失敗</p>";
                    echo "<p class='info'>原因候補:</p>";
                    echo "<ul>";
                    echo "<li>PHPエラーが発生している</li>";
                    echo "<li>file_get_contents関数が無効</li>";
                    echo "<li>HTTPコンテキストの問題</li>";
                    echo "</ul>";
                }
            } catch (Exception $e) {
                echo "<p class='error'>❌ メインAPIテストエラー: " . htmlspecialchars($e->getMessage()) . "</p>";
            }
        } else {
            echo "<p class='error'>❌ advanced_tariff_api.php が見つかりません</p>";
        }
        
        // 4. cURL使用可能かテスト
        echo "<h3>4. cURL動作テスト</h3>";
        if (function_exists('curl_init')) {
            try {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "http://{$_SERVER['HTTP_HOST']}/api_test.php?action=test");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($response && $httpCode === 200) {
                    echo "<p class='success'>✅ cURL動作確認: OK</p>";
                } else {
                    echo "<p class='warning'>⚠️  cURL応答エラー (HTTP: {$httpCode})</p>";
                }
            } catch (Exception $e) {
                echo "<p class='error'>❌ cURLテストエラー: " . htmlspecialchars($e->getMessage()) . "</p>";
            }
        } else {
            echo "<p class='error'>❌ cURL拡張が利用できません</p>";
        }
        ?>
    </div>

    <div class="section">
        <h2>🎯 トラブルシューティング</h2>
        <?php if (!file_exists('advanced_tariff_calculator.html')): ?>
            <p class="error">❌ メインファイルが見つかりません</p>
            <p>解決方法: ファイルが正しいディレクトリにあることを確認してください</p>
        <?php endif; ?>
        
        <?php if (!extension_loaded('curl')): ?>
            <p class="warning">⚠️  curl拡張が必要です</p>
            <p>解決方法: brew install php または apt install php-curl</p>
        <?php endif; ?>
        
        <p class="info">もし問題が続く場合:</p>
        <ol>
            <li>ターミナルで以下を実行: <code>php --version</code></li>
            <li>ファイルの存在確認: <code>ls -la *.html *.php</code></li>
            <li>権限確認: <code>chmod 644 *.html *.php</code></li>
            <li>代替ポート試行: <code>php -S localhost:8080</code></li>
        </ol>
    </div>

    <div class="section">
        <h2>📊 システム情報</h2>
        <pre><?php
        echo "OS: " . php_uname() . "\n";
        echo "PHP実行ファイル: " . PHP_BINARY . "\n";
        echo "メモリ制限: " . ini_get('memory_limit') . "\n";
        echo "最大実行時間: " . ini_get('max_execution_time') . "秒\n";
        echo "アップロード制限: " . ini_get('upload_max_filesize') . "\n";
        ?></pre>
    </div>

    <script>
        // 自動リフレッシュ（30秒後）
        setTimeout(() => {
            window.location.reload();
        }, 30000);
        
        console.log('📊 PHP診断完了 - 30秒後に自動更新');
    </script>
</body>
</html>
