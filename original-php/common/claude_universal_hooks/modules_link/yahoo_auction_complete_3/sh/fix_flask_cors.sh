#!/bin/bash
# Flask-CORS 完全修正スクリプト

echo "🔧 Flask-CORS 完全修正中..."

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool

# 既存APIサーバー停止
echo "📋 既存APIサーバー停止中..."
pkill -f "enhanced_complete_api_updated.py"
sleep 2

# 仮想環境セットアップ
echo "📋 仮想環境セットアップ中..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# 必要ライブラリインストール
echo "📋 必要ライブラリインストール中..."
pip install flask flask-cors pandas requests

# APIサーバー再起動
echo "📋 APIサーバー再起動中..."
nohup python3 enhanced_complete_api_updated.py > api_server_fixed.log 2>&1 &
NEW_PID=$!

sleep 3

# ヘルスチェック
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Flask-CORS修正完了！"
    echo "🆔 新しいPID: $NEW_PID"
    echo "🌐 フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
    echo "🔧 停止コマンド: kill $NEW_PID"
else
    echo "❌ 修正失敗。ログ確認: cat api_server_fixed.log"
fi
