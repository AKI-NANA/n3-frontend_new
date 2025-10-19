<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html>
<head>
    <title>超シンプルテスト</title>
</head>
<body>
    <h1>🔧 超シンプルPHPテスト</h1>
    <p>PHP動作確認: <?= "OK - " . date('H:i:s') ?></p>
    <p>このページが表示されれば、PHPは正常動作しています。</p>
    
    <hr>
    <h2>簡単なテストボタン</h2>
    <button onclick="alert('JavaScriptも動作しています')">JavaScript テスト</button>
    
    <hr>
    <p><strong>結論: このページが見えるなら、元のファイルに問題があります。</strong></p>
</body>
</html>
