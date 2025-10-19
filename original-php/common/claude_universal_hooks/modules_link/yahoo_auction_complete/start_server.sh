#!/bin/bash

# Yahoo Auction Complete Server Starter
echo "🚀 Yahoo Auction Complete サーバー起動中..."

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# ポート8080が使用中かチェック
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  ポート8080は既に使用中です。"
    echo "🔧 既存のプロセスを終了します..."
    pkill -f "php -S localhost:8080"
    sleep 2
fi

# PHPサーバー起動
echo "📡 PHPサーバーを localhost:8080 で起動中..."
nohup php -S localhost:8080 > server.log 2>&1 &

# 起動確認
sleep 3
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ サーバー起動成功！"
    echo "🌐 アクセス URL:"
    echo "   - 24ツール統合システム: http://localhost:8080/yahoo_auction_complete_24tools.html"
    echo "   - システムルート: http://localhost:8080/"
    echo ""
    echo "🛑 サーバー停止: pkill -f 'php -S localhost:8080'"
else
    echo "❌ サーバー起動に失敗しました。"
    echo "📋 ログを確認: cat server.log"
fi
