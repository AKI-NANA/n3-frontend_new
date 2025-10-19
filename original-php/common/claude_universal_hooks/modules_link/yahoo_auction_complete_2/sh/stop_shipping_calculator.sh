#!/bin/bash

# 🛑 送料・利益計算エディター 停止スクリプト

echo "🛑 送料・利益計算エディターを停止中..."

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# PIDファイルからプロセス停止
if [ -f .api_server.pid ]; then
    API_PID=$(cat .api_server.pid)
    if ps -p $API_PID > /dev/null; then
        kill $API_PID
        echo "✅ APIサーバー停止 (PID: $API_PID)"
    fi
    rm .api_server.pid
fi

if [ -f .php_server.pid ]; then
    PHP_PID=$(cat .php_server.pid)
    if ps -p $PHP_PID > /dev/null; then
        kill $PHP_PID
        echo "✅ PHPサーバー停止 (PID: $PHP_PID)"
    fi
    rm .php_server.pid
fi

# ポート使用プロセスを強制停止
echo "🔍 残存プロセス確認中..."
lsof -ti:5001 | xargs -r kill -9 2>/dev/null
lsof -ti:8080 | xargs -r kill -9 2>/dev/null

echo "🎉 送料・利益計算エディター停止完了"
