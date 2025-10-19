#!/bin/bash

echo "=== ポート8080使用プロセス確認・修復スクリプト ==="
echo "現在時刻: $(date)"
echo ""

# ポート8080を使用しているプロセスを確認
echo "🔍 ポート8080を使用しているプロセス:"
lsof -i :8080

echo ""
echo "🛑 ポート8080を使用しているプロセスを停止します..."

# ポート8080を使用しているプロセスのPIDを取得して停止
PID=$(lsof -t -i :8080)
if [ ! -z "$PID" ]; then
    echo "プロセスPID: $PID を停止します..."
    kill -9 $PID
    sleep 2
    echo "✅ プロセス停止完了"
else
    echo "ℹ️ ポート8080を使用しているプロセスが見つかりませんでした"
fi

echo ""
echo "🔍 停止後のポート状況確認:"
lsof -i :8080 || echo "✅ ポート8080は現在空いています"

echo ""
echo "🚀 PHPサーバーを8080ポートで再起動します..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development
nohup php -S localhost:8080 > php_server.log 2>&1 &

sleep 3

echo ""
echo "🔍 サーバー起動確認:"
lsof -i :8080 || echo "❌ サーバーの起動に失敗しました"

echo ""
echo "📋 アクセス情報:"
echo "- サーバーURL: http://localhost:8080"
echo "- 編集システム: http://localhost:8080/modules/yahoo_auction_complete/new_structure/07_editing/editing.php"
echo "- 29ツール統合: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_complete_29tools_multi.html"
echo ""

echo "📊 サーバーログ確認:"
tail -n 5 /Users/aritahiroaki/NAGANO-3/N3-Development/php_server.log

