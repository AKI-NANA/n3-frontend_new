<?php
// サーバーテスト用ファイル
echo "<!DOCTYPE html>";
echo "<html lang='ja'>";
echo "<head>";
echo "<meta charset='UTF-8'>";
echo "<title>サーバーテスト</title>";
echo "</head>";
echo "<body>";
echo "<h1>✅ PHPサーバー正常動作中</h1>";
echo "<p>現在時刻: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>PHPバージョン: " . phpversion() . "</p>";
echo "<p><a href='editor.php'>→ 統合編集システムへ</a></p>";
echo "</body>";
echo "</html>";
?>