#!/bin/bash

# 実行権限付与スクリプト
echo "🔐 実行権限を付与中..."

# メインスクリプト
chmod +x start_yahoo_auction_system_fixed.sh
chmod +x stop_yahoo_auction_system.sh
chmod +x setup_permissions.sh

# Pythonファイル
chmod +x api_servers/yahoo_auction_api_server_fixed.py
chmod +x scrapers/yahoo_auction_scraper_enhanced.py
chmod +x database_systems/database_manager.py

# ディレクトリ権限
chmod 755 core_systems scrapers api_servers ui_interfaces shipping_calculation database_systems utilities archive

echo "✅ 実行権限付与完了"
echo ""
echo "📋 実行可能なファイル:"
echo "  ./start_yahoo_auction_system_fixed.sh  - システム起動"
echo "  ./stop_yahoo_auction_system.sh         - システム停止"
echo "  python3 api_servers/yahoo_auction_api_server_fixed.py  - APIサーバー単体起動"
echo "  python3 scrapers/yahoo_auction_scraper_enhanced.py     - スクレイピング単体実行"
echo ""
echo "📁 整理されたフォルダ構造:"
echo "  📂 scrapers/              - スクレイピングツール"
echo "  📂 api_servers/           - APIサーバー"
echo "  📂 ui_interfaces/         - ユーザーインターフェース"
echo "  📂 database_systems/      - データベース関連"
echo "  📂 archive/              - バックアップ・アーカイブ"
echo ""
echo "🚀 システム起動方法:"
echo "  ./start_yahoo_auction_system_fixed.sh"
echo "  ブラウザ: http://localhost:8080/modules/yahoo_auction_complete/ui_interfaces/yahoo_auction_tool_fixed.php"
