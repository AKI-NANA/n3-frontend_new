#!/bin/bash

# Yahoo Auction Tool 用 PHP内蔵サーバー起動スクリプト (8080ポート版)

echo "🚀 Yahoo Auction Tool - PHP内蔵サーバー起動中..."

# ディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

# PHPバージョン確認
echo "📋 PHPバージョン確認:"
php -v

echo ""
echo "🌐 サーバー起動中..."
echo "📍 ドキュメントルート: $(pwd)"
echo "🔗 アクセスURL: http://localhost:8080"
echo ""
echo "⚠️  サーバーを停止するには Ctrl+C を押してください"
echo "✅ 全12ツール対応・ポート8080"
echo ""

# PHP内蔵サーバー起動 (ポート8080)
php -S localhost:8080 -t .
