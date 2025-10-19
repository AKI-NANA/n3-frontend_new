#!/bin/bash
# ポート9000でサーバー起動（8080が使用中の場合）

echo "🚀 ポート9000でサーバー起動"
echo "========================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/

echo "📋 現在のディレクトリ:"
pwd

echo ""
echo "📋 ポート確認:"
lsof -i :9000 || echo "ポート9000は利用可能"

echo ""
echo "📋 PHPサーバー起動 (ポート9000)"
echo "ブラウザアクセス先:"
echo "http://localhost:9000/new_structure/09_shipping/unified_comparison.php"
echo ""
echo "⚠️  サーバー停止: Ctrl+C"
echo ""

# ポート9000でサーバー起動
php -S localhost:9000