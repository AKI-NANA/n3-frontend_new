#!/bin/bash

# Yahoo Auction編集システム - 完全修復版起動スクリプト
# ローカルサーバーを起動して修復版システムにアクセス

echo "🚀 Yahoo Auction編集システム - 完全修復版を起動します..."

# 現在のディレクトリを確認
CURRENT_DIR=$(pwd)
echo "📁 現在のディレクトリ: $CURRENT_DIR"

# 07_editingディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing

echo "📂 07_editingディレクトリに移動しました"
echo "🔍 利用可能なファイル:"
ls -la editor_fixed_complete.*

echo ""
echo "🌐 PHPビルトインサーバーを起動します..."
echo "📋 アクセス方法:"
echo "   ブラウザで以下のURLにアクセスしてください:"
echo "   http://localhost:8080/editor_fixed_complete.php"
echo ""
echo "⚠️  サーバーを停止するには Ctrl+C を押してください"
echo ""

# PHPビルトインサーバーを起動
php -S localhost:8080