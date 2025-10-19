#!/bin/bash

# Yahoo Auction Tool 独立起動スクリプト

echo "🚀 Yahoo Auction Tool 独立サーバー起動中..."

# 現在のディレクトリ確認
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# PHPサーバー起動 (ポート8081)
echo "📱 PHPサーバー起動: http://localhost:8081"
php -S localhost:8081 index.php &
PHP_PID=$!
echo $PHP_PID > .php_standalone.pid

echo "✅ Yahoo Auction Tool 独立サーバー起動完了"
echo "🌐 アクセス先: http://localhost:8081"
echo "📱 API サーバー: http://localhost:5001"
echo ""
echo "🛑 停止する場合: kill $PHP_PID"

# サーバー稼働確認
sleep 2
if curl -s http://localhost:8081 > /dev/null; then
    echo "✅ サーバー正常稼働確認"
else
    echo "❌ サーバー起動エラー"
fi

wait
