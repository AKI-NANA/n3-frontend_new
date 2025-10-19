#!/bin/bash

# Yahoo Auction System - 停止スクリプト
# 作成日: 2025年9月9日

echo "🛑 Yahoo Auction System 停止中..."

# ポート5002で動作中のプロセスを停止
echo "📊 ポート5002のプロセスを確認中..."
PID=$(lsof -ti:5002)

if [ ! -z "$PID" ]; then
    echo "🔄 プロセス $PID を停止中..."
    kill -TERM $PID
    sleep 2
    
    # まだ動作していれば強制終了
    if kill -0 $PID 2>/dev/null; then
        echo "⚡ 強制終了中..."
        kill -KILL $PID
    fi
    echo "✅ プロセス停止完了"
else
    echo "ℹ️  ポート5002で動作中のプロセスは見つかりませんでした"
fi

# その他のPythonプロセスも確認
echo ""
echo "🐍 関連Pythonプロセス確認中..."
ps aux | grep "yahoo_auction_api_server" | grep -v grep

echo ""
echo "✅ Yahoo Auction System 停止完了"
echo "$(date): System stopped" >> logs/system.log 2>/dev/null || true
