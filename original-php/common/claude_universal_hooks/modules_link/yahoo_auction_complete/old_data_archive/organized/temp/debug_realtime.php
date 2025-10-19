<?php
/**
 * デバッグ用ログ表示ツール
 * リアルタイムでエラー確認
 */

// 直近のエラーログを表示するための簡易ツール
$errorLogPaths = [
    '/opt/homebrew/var/log/httpd/error.log',
    '/opt/homebrew/var/log/apache2/error.log',
    '/usr/local/var/log/httpd/error_log',
    '/usr/local/var/log/apache2/error_log',
    '/var/log/apache2/error.log',
    '/var/log/httpd/error_log'
];

?>
<!DOCTYPE html>
<html>
<head>
    <title>デバッグログ表示ツール</title>
    <meta charset="utf-8">
    <style>
        body { font-family: monospace; padding: 20px; }
        .log-entry { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .error { background: #ffe6e6; border-left: 4px solid #ff0000; }
        .info { background: #e6f3ff; border-left: 4px solid #0066cc; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <h1>🔍 リアルタイムデバッグ</h1>
    
    <div>
        <h3>📊 エラーログパス確認</h3>
        <?php foreach ($errorLogPaths as $path): ?>
            <div class="log-entry <?= file_exists($path) ? 'info' : '' ?>">
                <strong><?= $path ?></strong>: 
                <?= file_exists($path) ? '✅ 存在' : '❌ なし' ?>
                <?php if (file_exists($path)): ?>
                    (サイズ: <?= filesize($path) ?> bytes)
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
    
    <div>
        <h3>🔧 PHP設定確認</h3>
        <div class="log-entry info">
            <strong>error_log:</strong> <?= ini_get('error_log') ?: 'システムログ' ?><br>
            <strong>log_errors:</strong> <?= ini_get('log_errors') ? 'ON' : 'OFF' ?><br>
            <strong>display_errors:</strong> <?= ini_get('display_errors') ? 'ON' : 'OFF' ?><br>
            <strong>error_reporting:</strong> <?= error_reporting() ?>
        </div>
    </div>
    
    <div>
        <h3>⚡ HTMLテンプレートAPI直接テスト</h3>
        <button onclick="testHTMLTemplateAPI()">🧪 API直接テスト実行</button>
        <div id="apiResult"></div>
    </div>
    
    <div>
        <h3>📄 直近のエラーログ（存在する場合）</h3>
        <?php
        $foundLogs = array_filter($errorLogPaths, 'file_exists');
        if (empty($foundLogs)) {
            echo '<div class="log-entry">エラーログファイルが見つかりません</div>';
        } else {
            foreach ($foundLogs as $logPath) {
                echo "<h4>📁 {$logPath}</h4>";
                if (filesize($logPath) > 0) {
                    $lines = file($logPath);
                    $recentLines = array_slice($lines, -20); // 最新20行
                    foreach ($recentLines as $line) {
                        $class = 'log-entry';
                        if (stripos($line, 'error') !== false) $class .= ' error';
                        elseif (stripos($line, 'html') !== false) $class .= ' info';
                        echo "<div class='{$class}'>" . htmlspecialchars(trim($line)) . "</div>";
                    }
                } else {
                    echo '<div class="log-entry">ログファイルは空です</div>';
                }
            }
        }
        ?>
    </div>
    
    <script>
        async function testHTMLTemplateAPI() {
            const resultDiv = document.getElementById('apiResult');
            resultDiv.innerHTML = '<div class="log-entry">⏳ API テスト実行中...</div>';
            
            const testData = {
                action: 'save_html_template',
                template_data: {
                    name: 'debug_direct_test_' + Date.now(),
                    category: 'general',
                    description: '直接APIテスト',
                    html_content: '<h1>{{TITLE}}</h1><p>価格: ${{PRICE}}</p>',
                    created_by: 'debug_direct'
                }
            };
            
            try {
                console.log('🚀 APIテストデータ:', testData);
                
                const response = await fetch('html_template_api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                console.log('📡 レスポンス状態:', response.status, response.statusText);
                
                const responseText = await response.text();
                console.log('📄 生レスポンス:', responseText);
                
                try {
                    const result = JSON.parse(responseText);
                    console.log('✅ JSON解析成功:', result);
                    
                    resultDiv.innerHTML = `
                        <div class="log-entry ${result.success ? 'info' : 'error'}">
                            <strong>結果:</strong> ${result.success ? '✅ 成功' : '❌ 失敗'}<br>
                            <strong>メッセージ:</strong> ${result.message}<br>
                            <strong>データ:</strong> ${JSON.stringify(result.data, null, 2)}<br>
                            <strong>タイムスタンプ:</strong> ${result.timestamp}
                        </div>
                    `;
                } catch (jsonError) {
                    console.error('❌ JSON解析エラー:', jsonError);
                    resultDiv.innerHTML = `
                        <div class="log-entry error">
                            <strong>JSON解析エラー:</strong> ${jsonError.message}<br>
                            <strong>生レスポンス:</strong><br>
                            <pre>${responseText}</pre>
                        </div>
                    `;
                }
                
            } catch (error) {
                console.error('❌ API呼び出しエラー:', error);
                resultDiv.innerHTML = `
                    <div class="log-entry error">
                        <strong>API呼び出しエラー:</strong> ${error.message}
                    </div>
                `;
            }
        }
        
        console.log('🔍 デバッグツール準備完了');
    </script>
</body>
</html>
