#!/bin/bash

# Yahoo Auction Tool 用 PHP内蔵サーバー起動スクリプト

echo "🚀 Yahoo Auction Tool - PHP内蔵サーバー起動中..."

# ディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# PHPバージョン確認
echo "📋 PHPバージョン確認:"
php -v

echo ""
echo "🌐 サーバー起動中..."
echo "📍 ドキュメントルート: $(pwd)"
echo "🔗 アクセスURL: http://localhost:8000"
echo ""
echo "⚠️  サーバーを停止するには Ctrl+C を押してください"
echo ""

# PHP内蔵サーバー起動
php -S localhost:8000 -t .
