<?php
/**
 * Yahoo Auction Tool - 最小限テスト版
 * HTTP 500エラー解決用
 */

// エラー表示を有効化してデバッグ
error_reporting(E_ALL);
ini_set('display_errors', 1);

// PHPセッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

echo "PHP基本動作テスト: OK";

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Tool - テスト版</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Yahoo Auction Tool - 動作テスト</h1>
        
        <div class="success">
            ✅ PHP基本動作: 正常
        </div>
        
        <div class="success">
            ✅ HTML表示: 正常
        </div>
        
        <div>
            <h3>次のステップ:</h3>
            <ol>
                <li>この画面が表示されれば、基本的なPHP動作は問題なし</li>
                <li>段階的に機能を追加していきます</li>
            </ol>
        </div>
        
        <div style="margin-top: 30px;">
            <p><strong>現在時刻:</strong> <?= date('Y-m-d H:i:s'); ?></p>
            <p><strong>PHPバージョン:</strong> <?= phpversion(); ?></p>
        </div>
    </div>
</body>
</html>
