#!/bin/bash
# 簡単なサーバー起動 - APIテスト用（正しいパス）

echo "🚀 APIテスト用サーバー起動"
echo "========================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/

echo "📋 現在のディレクトリ:"
pwd

echo ""
echo "📋 PHPサーバー起動 (ポート8080)"
echo "ブラウザアクセス先:"
echo "http://localhost:8080/new_structure/09_shipping/unified_comparison.php"
echo ""
echo "📋 ファイル存在確認:"
if [ -f "new_structure/09_shipping/unified_comparison.php" ]; then
    echo "✅ unified_comparison.php 存在"
else
    echo "❌ unified_comparison.php 不在"
    echo "ファイル一覧:"
    ls -la new_structure/09_shipping/*.php 2>/dev/null || echo "PHPファイルなし"
fi

echo ""
echo "⚠️  サーバー停止: Ctrl+C"
echo ""

# PHPサーバー起動
php -S localhost:8080