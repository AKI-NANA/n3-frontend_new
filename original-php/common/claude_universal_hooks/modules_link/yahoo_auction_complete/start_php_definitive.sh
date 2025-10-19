#!/bin/bash

echo "🚀 PHP専用サーバー起動（確実版）"

# 正しいディレクトリに移動
TARGET_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete"
cd "$TARGET_DIR"

echo "📁 作業ディレクトリ: $(pwd)"

# 全てのサーバープロセスを終了
echo "🛑 既存サーバープロセス終了中..."
pkill -f "php -S" 2>/dev/null
pkill -f "python.*http.server" 2>/dev/null
sleep 3

# ポートを完全にクリア
for port in 8080 8081 8082 9000; do
    lsof -ti:$port | xargs kill -9 2>/dev/null
done
sleep 2

# PHPバージョン確認
echo "🔧 PHP確認:"
which php
php --version | head -1

# テストファイル作成（確実に動作するもの）
echo "📝 テストファイル作成中..."
cat > simple_test.php << 'EOF'
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
EOF

# PHPサーバー起動（ポート8080）
echo "📡 PHPサーバー起動中（ポート8080）..."
php -S localhost:8080 > php_server.log 2>&1 &
PHP_PID=$!

# 起動確認
sleep 5
if kill -0 $PHP_PID 2>/dev/null; then
    echo "✅ PHPサーバー起動成功！"
    echo "🔢 プロセスID: $PHP_PID"
    echo ""
    echo "🌐 アクセスURL:"
    echo "   http://localhost:8080/simple_test.php"
    echo "   http://localhost:8080/test_php.php"
    echo "   http://localhost:8080/php_tools_index.php"
    echo ""
    echo "📋 ログ確認: tail -f php_server.log"
    echo "🛑 停止: kill $PHP_PID"
    
    # アクセステスト
    sleep 2
    echo "🧪 接続テスト中..."
    if curl -s http://localhost:8080/simple_test.php | grep -q "PHP正常動作中"; then
        echo "✅ 接続テスト成功！"
    else
        echo "⚠️ 接続テストで問題検出"
        echo "📋 サーバーログ:"
        cat php_server.log
    fi
else
    echo "❌ サーバー起動失敗"
    echo "📋 エラーログ:"
    cat php_server.log
fi

echo ""
echo "🔍 最終確認:"
ps aux | grep "php -S" | grep -v grep
lsof -i :8080
