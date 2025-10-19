#!/bin/bash

# Yahoo Auction System - 修正版セットアップスクリプト
# 必要パッケージの自動インストール

echo "🔧 Yahoo Auction System セットアップ中..."
echo "=============================================="

# 現在のディレクトリ確認
echo "📁 現在のディレクトリ: $(pwd)"

# Pythonバージョン確認
echo ""
echo "🐍 Python環境確認:"
python3 --version
which python3

# 必要ディレクトリ作成
echo ""
echo "📂 必要ディレクトリ作成中..."
mkdir -p logs
mkdir -p uploads
mkdir -p database_systems/backups
echo "✅ ディレクトリ作成完了"

# venv確認（既に venv 環境にいる場合はスキップ）
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo ""
    echo "✅ 仮想環境が有効です: $VIRTUAL_ENV"
else
    echo ""
    echo "⚠️  仮想環境が無効です。venv環境での実行を推奨します。"
    echo "   python3 -m venv venv && source venv/bin/activate"
fi

# 必要パッケージのインストール
echo ""
echo "📦 必要パッケージをインストール中..."

# 個別インストール（エラーが出ても続行）
packages=(
    "flask>=2.3.0"
    "flask-cors>=4.0.0"
    "requests>=2.31.0"
    "beautifulsoup4>=4.12.0"
    "lxml>=4.9.0"
    "pandas>=2.0.0"
    "python-dateutil>=2.8.0"
    "urllib3>=1.26.0"
)

for package in "${packages[@]}"; do
    echo "📥 インストール中: $package"
    pip3 install "$package" || echo "⚠️  $package のインストールに失敗しましたが続行します"
done

# インストール済みパッケージ確認
echo ""
echo "📋 インストール確認:"
pip3 list | grep -E "(flask|requests|beautifulsoup4|pandas|flask-cors|lxml)" || echo "⚠️  一部パッケージが見つかりません"

# 権限設定
echo ""
echo "🔐 実行権限設定中..."
chmod +x start_yahoo_auction_system_fixed.sh
chmod +x stop_yahoo_auction_system.sh
chmod +x setup_permissions.sh
chmod +x api_servers/yahoo_auction_api_server_fixed.py
chmod +x scrapers/yahoo_auction_scraper_enhanced.py

# ログファイル初期化
echo ""
echo "📝 ログファイル初期化中..."
touch logs/system.log
touch logs/api_server.log
echo "$(date): Setup completed" > logs/system.log

echo ""
echo "=============================================="
echo "✅ セットアップ完了！"
echo ""
echo "🚀 システム起動方法:"
echo "  ./start_yahoo_auction_system_fixed.sh"
echo ""
echo "🌐 アクセス先:"
echo "  http://localhost:8080/modules/yahoo_auction_complete/ui_interfaces/yahoo_auction_tool_fixed.php"
echo ""
echo "📋 トラブルシューティング:"
echo "  エラーが発生した場合は以下を確認:"
echo "  1. venv環境の有効化: source venv/bin/activate"
echo "  2. 必要パッケージ再インストール: pip3 install flask flask-cors"
echo "  3. ポート確認: lsof -i :5002"
