#!/bin/bash

# Yahoo Auction 編集システム - 直接起動スクリプト
# PHPビルトインサーバーでediting.phpを起動

echo "🚀 Yahoo Auction データ編集システムを起動中..."

# 編集システムディレクトリに移動
cd "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing"

# PHPビルトインサーバーを起動（ポート8080）
echo "📡 PHPサーバーをポート8080で起動..."
echo "🌐 ブラウザで以下のURLにアクセス:"
echo "   http://localhost:8080/editing.php"
echo ""
echo "⚠️  終了するには Ctrl+C を押してください"
echo ""

php -S localhost:8080

echo "✅ サーバーを停止しました"