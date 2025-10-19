#!/bin/bash
# Yahoo Auction Tool 完全版起動スクリプト（仮想環境対応）

CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system"
cd "$CURRENT_DIR"

echo "🚀 Yahoo Auction Tool 送料・利益計算システム起動中..."

# 仮想環境アクティベート
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ 仮想環境アクティベート"
else
    echo "❌ 仮想環境が見つかりません。setup.shを実行してください。"
    exit 1
fi

# APIサーバー起動
echo "📡 APIサーバー起動中 (ポート: 5001)..."
python3 profit_calculator_api.py &
API_PID=$!

# 5秒待機してAPIテスト
sleep 5

# API接続テスト
echo "🔍 API接続テスト中..."
curl -s http://localhost:5001/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ APIサーバー正常起動"
else
    echo "❌ APIサーバー起動確認できませんが、継続します"
fi

# Webサーバー起動（HTMLファイル用）
echo "🌐 Webサーバー起動中 (ポート: 8080)..."
python3 -m http.server 8080 &
WEB_PID=$!

echo "✅ システム起動完了!"
echo ""
echo "📊 アクセス先:"
echo "   - フロントエンド: http://localhost:8080/index.html"
echo "   - API: http://localhost:5001"
echo ""
echo "🛑 停止方法:"
echo "   Ctrl+C または ./stop_system.sh"

# PIDファイル保存
echo $API_PID > api.pid
echo $WEB_PID > web.pid

# 終了シグナル待機
trap 'echo "🛑 システム停止中..."; kill $API_PID $WEB_PID 2>/dev/null; rm -f *.pid; exit 0' INT TERM

wait
