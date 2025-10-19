#!/bin/bash
# Yahoo Auction Tool 完全版停止スクリプト

CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system"
cd "$CURRENT_DIR"

echo "🛑 Yahoo Auction Tool システム停止中..."

# PIDファイルから停止
if [ -f api.pid ]; then
    API_PID=$(cat api.pid)
    kill $API_PID 2>/dev/null
    rm -f api.pid
    echo "✅ APIサーバー停止"
fi

if [ -f web.pid ]; then
    WEB_PID=$(cat web.pid)
    kill $WEB_PID 2>/dev/null
    rm -f web.pid
    echo "✅ Webサーバー停止"
fi

# Python プロセス強制停止（念のため）
pkill -f "profit_calculator_api.py" 2>/dev/null
pkill -f "python3 -m http.server 8080" 2>/dev/null

echo "✅ システム停止完了"
