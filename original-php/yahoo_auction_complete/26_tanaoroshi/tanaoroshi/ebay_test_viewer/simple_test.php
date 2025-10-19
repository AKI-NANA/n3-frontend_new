<?php
/**
 * 超シンプル診断ページ - エラー特定用
 */

// 基本セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// エラー表示を有効にする
error_reporting(E_ALL);
ini_set('display_errors', 1);

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>シンプル診断ページ</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #f5f5f5; }
        .container { background: white; padding: 2rem; border-radius: 8px; max-width: 800px; margin: 0 auto; }
        .success { color: #10b981; font-weight: bold; }
        .error { color: #dc2626; font-weight: bold; }
        .info { background: #e0f2fe; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .test-item { padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 eBayテストビューアー - シンプル診断</h1>
        
        <div class="info">
            <strong>目的：</strong>ページ表示問題の根本原因特定
        </div>
        
        <h2>📋 基本環境チェック</h2>
        
        <div class="test-item">
            <strong>PHP バージョン:</strong> <?= PHP_VERSION ?> 
            <span class="success">✓</span>
        </div>
        
        <div class="test-item">
            <strong>セッション状態:</strong> <?= session_status() === PHP_SESSION_ACTIVE ? 'アクティブ' : '非アクティブ' ?>
            <span class="success">✓</span>
        </div>
        
        <div class="test-item">
            <strong>現在時刻:</strong> <?= date('Y-m-d H:i:s') ?>
            <span class="success">✓</span>
        </div>
        
        <div class="test-item">
            <strong>SECURE_ACCESS:</strong> <?= defined('SECURE_ACCESS') ? 'OK' : 'NG' ?>
            <span class="<?= defined('SECURE_ACCESS') ? 'success' : 'error' ?>">
                <?= defined('SECURE_ACCESS') ? '✓' : '✗' ?>
            </span>
        </div>
        
        <h2>🔌 データベース接続テスト</h2>
        
        <?php
        $db_test_results = [];
        $passwords = ['postgres', 'Kn240914', '', 'aritahiroaki'];
        $databases = ['nagano3_db', 'ebay_kanri_db'];
        
        foreach ($databases as $dbname) {
            foreach ($passwords as $password) {
                try {
                    $dsn = "pgsql:host=localhost;port=5432;dbname={$dbname}";
                    $pdo = new PDO($dsn, 'postgres', $password, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_TIMEOUT => 3
                    ]);
                    
                    $db_test_results[] = [
                        'database' => $dbname,
                        'password' => $password !== '' ? 'パスワード設定済み' : '空のパスワード',
                        'status' => 'success',
                        'message' => '接続成功'
                    ];
                    
                    // 最初の成功で停止
                    break 2;
                    
                } catch (PDOException $e) {
                    $db_test_results[] = [
                        'database' => $dbname,
                        'password' => $password !== '' ? 'パスワード設定済み' : '空のパスワード',
                        'status' => 'error',
                        'message' => substr($e->getMessage(), 0, 100) . '...'
                    ];
                }
            }
        }
        
        foreach ($db_test_results as $result) {
            echo '<div class="test-item">';
            echo '<strong>DB: ' . $result['database'] . '</strong> (' . $result['password'] . ') - ';
            echo '<span class="' . ($result['status'] === 'success' ? 'success' : 'error') . '">';
            echo $result['message'];
            echo '</span>';
            echo '</div>';
        }
        ?>
        
        <h2>📁 ファイル存在チェック</h2>
        
        <?php
        $files_to_check = [
            'ebay_test_viewer_content.php' => __DIR__ . '/ebay_test_viewer_content.php',
            'debug_data.php' => __DIR__ . '/debug_data.php',
            'database_universal_connector.php' => __DIR__ . '/../../hooks/1_essential/database_universal_connector.php',
            'index.php (main)' => __DIR__ . '/../../index.php'
        ];
        
        foreach ($files_to_check as $name => $path) {
            $exists = file_exists($path);
            $readable = $exists ? is_readable($path) : false;
            
            echo '<div class="test-item">';
            echo '<strong>' . $name . ':</strong> ';
            echo '<span class="' . ($exists ? 'success' : 'error') . '">';
            echo $exists ? '存在' : '不存在';
            if ($exists) {
                echo ' (' . ($readable ? '読み取り可能' : '読み取り不可') . ')';
            }
            echo '</span>';
            echo '</div>';
        }
        ?>
        
        <h2>🌐 Ajax通信テスト</h2>
        
        <button onclick="testAjax()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Ajax接続テスト実行
        </button>
        
        <div id="ajax-results" style="margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 4px; display: none;">
            <strong>結果:</strong>
            <pre id="ajax-output"></pre>
        </div>
        
        <h2>💡 次のステップ</h2>
        
        <div class="info">
            <ol>
                <li>このページが正常に表示されることを確認</li>
                <li>Ajax通信テストが成功することを確認</li>
                <li>データベース接続が成功していることを確認</li>
                <li>元のebay_test_viewer_contentページの修正を開始</li>
            </ol>
        </div>
        
    </div>
    
    <script>
    async function testAjax() {
        const resultsDiv = document.getElementById('ajax-results');
        const outputPre = document.getElementById('ajax-output');
        
        resultsDiv.style.display = 'block';
        outputPre.textContent = 'テスト中...';
        
        try {
            const response = await fetch('debug_data.php');
            const text = await response.text();
            
            outputPre.textContent = 'Status: ' + response.status + '\n\n' + text;
            
            if (response.ok) {
                resultsDiv.style.background = '#f0fdf4';
                resultsDiv.style.border = '1px solid #bbf7d0';
            } else {
                resultsDiv.style.background = '#fef2f2';
                resultsDiv.style.border = '1px solid #fecaca';
            }
            
        } catch (error) {
            outputPre.textContent = 'Ajax エラー: ' + error.message;
            resultsDiv.style.background = '#fef2f2';
            resultsDiv.style.border = '1px solid #fecaca';
        }
    }
    </script>
    
</body>
</html>