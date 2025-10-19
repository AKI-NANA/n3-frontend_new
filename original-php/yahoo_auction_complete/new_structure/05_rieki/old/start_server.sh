#!/bin/bash
# 高度統合利益計算システム - 正しいサーバー起動

echo "🚀 高度統合利益計算システム サーバー起動中..."
echo "📁 現在のディレクトリ: $(pwd)"
echo "📋 利用可能なファイル:"
ls -la *.html *.php
echo ""
echo "🌐 正しいアクセスURL:"
echo "   http://localhost:8080/advanced_tariff_calculator.html"
echo "   http://localhost:8080/server_help.html (ヘルプ)"
echo ""
echo "⚠️  サーバーを停止するには Ctrl+C を押してください"
echo "=================================================="

# PHPサーバー起動（ポート8080）
php -S localhost:8080
