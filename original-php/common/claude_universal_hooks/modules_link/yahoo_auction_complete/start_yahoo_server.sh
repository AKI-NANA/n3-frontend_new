#!/bin/bash

echo "🚀 Yahoo Auction Tool - PHPサーバー起動"
echo "================================================="

# 現在のディレクトリを確認
echo "📍 現在のディレクトリ: $(pwd)"

# Yahoo Auction Toolディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

echo "📂 ドキュメントルート: $(pwd)"

# PHPバージョン確認
echo "🔍 PHPバージョン:"
php -v

echo ""
echo "🌐 サーバー情報:"
echo "   URL: http://localhost:8000"
echo "   ドキュメントルート: $(pwd)"
echo "   停止方法: Ctrl+C"
echo ""
echo "📋 利用可能なツール:"
echo "   http://localhost:8000/new_structure/01_dashboard/dashboard.php"
echo "   http://localhost:8000/new_structure/02_scraping/scraping.php"
echo "   http://localhost:8000/new_structure/03_approval/approval.php"
echo "   ..."
echo ""
echo "⚡ サーバー起動中..."

# PHP内蔵サーバー起動（Yahoo Auction Toolディレクトリをルートとして）
php -S localhost:8000 -t .
