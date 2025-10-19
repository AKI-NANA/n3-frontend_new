#!/bin/bash
# Yahoo + eBay 統合システム 仮想環境アクティベート

cd "$(dirname "$0")"
source venv/bin/activate

echo "✅ Python仮想環境アクティベート完了"
echo "📋 利用可能コマンド:"
echo "  python unified_scraping_system.py status"
echo "  python unified_scraping_system.py \"<Yahoo URL>\""
echo "  python unified_scraping_system.py batch \"<URL1>\" \"<URL2>\""
echo ""
echo "🚀 終了時は 'deactivate' コマンドで仮想環境を終了してください"

# シェルを仮想環境付きで起動
exec "$SHELL"
