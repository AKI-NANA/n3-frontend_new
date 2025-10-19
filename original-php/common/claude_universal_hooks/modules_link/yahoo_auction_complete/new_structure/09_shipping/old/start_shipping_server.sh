#!/bin/bash
echo "🚢 送料計算システム 専用サーバー起動"
echo "============================"

cd "$(dirname "$0")"
echo "📁 現在のディレクトリ: $(pwd)"

# ファイル確認
echo "📋 利用可能なHTMLファイル:"
ls -la *.html 2>/dev/null || echo "HTMLファイルなし"

echo ""
echo "🚀 専用サーバー起動 (ポート8081)"
echo "🔗 アクセスURL:"
echo "   - http://localhost:8081/carrier_separated_matrix.html"
echo "   - http://localhost:8081/zone_management_ui.html"
echo "   - http://localhost:8081/zone_check_simple.html"
echo ""
echo "⚠️  停止するには Ctrl+C"

php -S localhost:8081 -t .
