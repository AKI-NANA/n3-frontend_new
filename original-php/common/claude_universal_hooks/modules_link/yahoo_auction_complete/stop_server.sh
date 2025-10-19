#!/bin/bash

# Yahoo Auction Complete Server Stopper
echo "🛑 Yahoo Auction Complete サーバー停止中..."

# サーバープロセスを停止
pkill -f "php -S localhost:8080"

# 停止確認
sleep 2
if ! lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ サーバーが正常に停止しました。"
else
    echo "⚠️  サーバーの停止に時間がかかっています..."
    echo "🔧 強制終了を試行中..."
    pkill -9 -f "php -S localhost:8080"
    sleep 1
    
    if ! lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ サーバーが強制停止されました。"
    else
        echo "❌ サーバーの停止に失敗しました。手動で確認してください。"
        echo "📋 プロセス確認: lsof -i :8080"
    fi
fi
