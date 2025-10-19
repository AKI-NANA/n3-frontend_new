#!/bin/bash

echo "🚀 Yahoo Auction Complete 24ツールシステム起動中..."

# 既存のサーバーを停止
echo "🛑 既存のサーバーを停止中..."
pkill -f "php -S localhost:8081" 2>/dev/null
pkill -f "php -S localhost:8080" 2>/dev/null
sleep 2

# 正しいディレクトリに移動
echo "📁 ディレクトリに移動中..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# 現在のディレクトリを表示
echo "📍 現在のディレクトリ: $(pwd)"

# ファイルの存在確認
if [ -f "yahoo_auction_complete_24tools.html" ]; then
    echo "✅ yahoo_auction_complete_24tools.html が見つかりました"
else
    echo "❌ yahoo_auction_complete_24tools.html が見つかりません"
    echo "📋 現在のファイル一覧:"
    ls -la | grep yahoo_auction
    exit 1
fi

# サーバー起動
echo "🌐 PHPサーバーを localhost:8081 で起動中..."
php -S localhost:8081 &
SERVER_PID=$!

# 起動確認
sleep 3
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ サーバー起動成功！"
    echo ""
    echo "🌐 アクセス URL:"
    echo "   - 24ツール統合システム: http://localhost:8081/yahoo_auction_complete_24tools.html"
    echo "   - システムルート: http://localhost:8081/"
    echo "   - 統合ダッシュボード: http://localhost:8081/n3_integrated_dashboard_complete_fixed.php"
    echo ""
    echo "🛑 サーバー停止: pkill -f 'php -S localhost:8081'"
    echo "📋 サーバーPID: $SERVER_PID"
else
    echo "❌ サーバー起動に失敗しました"
    exit 1
fi
