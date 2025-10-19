<?php
/**
 * Amazon統合システム - テスト用UI
 * ASINデータ取得テスト
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF トークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// テスト実行
$testResult = null;
$errorMessage = null;

if (isset($_POST['action']) && $_POST['action'] === 'test_asin' && !empty($_POST['asin'])) {
    try {
        // Amazon API クライアントをテスト
        require_once __DIR__ . '/api/amazon_api_client.php';
        
        // 設定ファイルも読み込み
        if (!file_exists(__DIR__ . '/api/amazon_api_client.php')) {
            throw new Exception('Amazon API クライアントファイルが見つかりません');
        }
        
        $client = new AmazonApiClient();
        $asin = trim($_POST['asin']);
        
        // ASIN検証
        if (!preg_match('/^[A-Z0-9]{10}$/', $asin)) {
            throw new Exception('無効なASIN形式です');
        }
        
        // API呼び出し
        $result = $client->getItemsByAsin([$asin]);
        $testResult = $result;
        
    } catch (Exception $e) {
        $errorMessage = $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazon API テスト - ASIN データ取得</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #34495e; }
        input[type="text"] { width: 100%; padding: 12px; border: 2px solid #bdc3c7; border-radius: 5px; font-size: 16px; }
        input[type="text"]:focus { border-color: #3498db; outline: none; }
        .btn { background: #3498db; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .btn:hover { background: #2980b9; }
        .result { margin-top: 30px; padding: 20px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .json-output { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
        .navigation { margin-top: 30px; text-align: center; }
        .navigation a { display: inline-block; margin: 0 10px; padding: 10px 20px; background: #95a5a6; color: white; text-decoration: none; border-radius: 5px; }
        .navigation a:hover { background: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛒 Amazon API テスト - ASIN データ取得</h1>
        
        <form method="POST" action="">
            <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
            
            <div class="form-group">
                <label for="asin">Amazon ASIN (10桁の英数字):</label>
                <input type="text" id="asin" name="asin" placeholder="例: B08N5WRWNW" 
                       value="<?php echo htmlspecialchars($_POST['asin'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" 
                       pattern="[A-Z0-9]{10}" maxlength="10" required>
                <small style="color: #7f8c8d;">※ 10桁の大文字英数字で入力してください</small>
            </div>
            
            <button type="submit" name="action" value="test_asin" class="btn">
                📡 ASIN データ取得テスト
            </button>
        </form>
        
        <?php if ($testResult): ?>
            <div class="result success">
                <h3>✅ API呼び出し成功！</h3>
                <p>Amazon PA-APIからデータを正常に取得できました。</p>
                
                <h4>取得データ:</h4>
                <div class="json-output"><?php echo json_encode($testResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?></div>
            </div>
        <?php endif; ?>
        
        <?php if ($errorMessage): ?>
            <div class="result error">
                <h3>❌ エラー発生</h3>
                <p><strong>エラー内容:</strong> <?php echo htmlspecialchars($errorMessage, ENT_QUOTES, 'UTF-8'); ?></p>
                
                <h4>解決方法:</h4>
                <ul>
                    <li>Amazon PA-API認証情報が正しく設定されているか確認</li>
                    <li>ASINが10桁の正しい形式であることを確認</li>
                    <li>ネットワーク接続を確認</li>
                    <li>API制限に達していないか確認</li>
                </ul>
            </div>
        <?php endif; ?>
        
        <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 5px;">
            <h3>📋 テスト手順</h3>
            <ol>
                <li>有効なASIN (例: B08N5WRWNW) を入力</li>
                <li>「ASIN データ取得テスト」ボタンをクリック</li>
                <li>成功すればAmazon商品データが表示されます</li>
                <li>エラーの場合は設定を見直してください</li>
            </ol>
            
            <h3>🔧 必要な設定</h3>
            <ul>
                <li>Amazon PA-API認証情報 (.envファイル)</li>
                <li>データベース接続設定</li>
                <li>必要なPHPライブラリ</li>
            </ul>
        </div>
        
        <div class="navigation">
            <a href="index.php">メインページに戻る</a>
            <a href="ui/amazon_editor_ui.php">Amazon編集UI</a>
            <a href="../02_scraping/scraping.php">Yahoo!スクレイピング</a>
        </div>
    </div>
</body>
</html>
