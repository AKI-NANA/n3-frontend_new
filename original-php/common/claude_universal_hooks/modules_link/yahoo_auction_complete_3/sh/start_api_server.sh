#!/bin/bash
chmod +x "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/start_api_server.sh"

echo "🚀 Yahoo→eBayワークフロー APIサーバー起動スクリプト"
echo "=================================================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# Python仮想環境の確認・起動
if [ -d "venv" ]; then
    echo "✅ Python仮想環境が見つかりました"
    source venv/bin/activate
else
    echo "⚠️  仮想環境が見つかりません。Python3で直接実行します"
fi

# 必要なライブラリチェック
echo "📦 必要なライブラリをチェック中..."
python3 -c "import playwright, pandas, flask" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 必要なライブラリが全て揃っています"
else
    echo "❌ 必要なライブラリが不足しています"
    echo "pip install playwright pandas flask requests"
    echo "playwright install chromium"
    exit 1
fi

echo ""
echo "🌐 APIサーバーを起動中..."
echo "URL: http://localhost:5001"
echo ""
echo "⚡ スクレイピング機能・データベース保存・検索機能が利用可能になります"
echo "📱 Ctrl+C で停止"
echo ""

# APIサーバー起動
python3 workflow_api_server_complete.py
