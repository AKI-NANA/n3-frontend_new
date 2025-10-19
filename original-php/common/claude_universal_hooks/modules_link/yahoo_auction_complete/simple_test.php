<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head><title>PHP動作テスト</title></head>
<body>
<h1>✅ PHP正常動作中！</h1>
<p>PHP Version: <?php echo phpversion(); ?></p>
<p>現在時刻: <?php echo date('Y-m-d H:i:s'); ?></p>
<p>ディレクトリ: <?php echo __DIR__; ?></p>
<h2>利用可能ファイル:</h2>
<ul>
<?php
$files = glob('*.php');
foreach($files as $file) {
    echo "<li><a href='$file'>$file</a></li>";
}
?>
</ul>
</body>
</html>
