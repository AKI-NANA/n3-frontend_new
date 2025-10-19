#!/bin/bash
# 空いているポートを自動で見つけてPHPサーバー起動

echo "🔍 空いているポートを検索中..."

PORTS=(8001 8002 8003 8004 8005 9001 9002 9003 7001 7002)

for PORT in "${PORTS[@]}"; do
    echo "ポート $PORT をテスト中..."
    if lsof -i:$PORT > /dev/null 2>&1; then
        echo "❌ ポート $PORT は使用中"
    else
        echo "✅ ポート $PORT が空いています！"
        echo ""
        echo "🚀 PHPサーバーをポート $PORT で起動します..."
        echo "📍 アクセスURL: http://localhost:$PORT/modules/yahoo_auction_tool/index.php"
        echo ""
        
        cd /Users/aritahiroaki/NAGANO-3/N3-Development
        php -S localhost:$PORT
        break
    fi
done
