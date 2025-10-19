#!/bin/bash
# 直接09_shippingからサーバー起動

echo "🚀 09_shipping ディレクトリから直接サーバー起動"
echo "============================================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 現在のディレクトリ:"
pwd

echo ""
echo "📋 ファイル確認:"
ls -la *.php | head -5

echo ""
echo "📋 PHPサーバー起動 (ポート8080)"
echo "ブラウザアクセス先:"
echo "http://localhost:8080/unified_comparison.php"
echo ""
echo "⚠️  サーバー停止: Ctrl+C"
echo ""

# 09_shippingディレクトリから直接起動
php -S localhost:8080