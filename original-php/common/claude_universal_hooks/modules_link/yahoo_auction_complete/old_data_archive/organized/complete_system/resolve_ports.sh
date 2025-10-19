#!/bin/bash
# ポート競合解決と新UIアクセススクリプト

echo "🔧 ポート競合解決中..."

# 1. 8080ポートを使用している全プロセスを停止
echo "🛑 8080ポート使用プロセス停止中..."
lsof -ti :8080 | xargs kill -9 2>/dev/null
sleep 2

# 2. 5001ポートも念のため停止
echo "🛑 5001ポート使用プロセス停止中..."
lsof -ti :5001 | xargs kill -9 2>/dev/null
sleep 2

# 3. PIDファイル削除
rm -f api.pid web.pid

# 4. 新しいポートでサーバー起動
echo "🚀 新しいポートでサーバー起動中..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system

# 仮想環境アクティベート
source venv/bin/activate

# APIサーバー起動（5001ポート）
python3 profit_calculator_api_flexible.py &
API_PID=$!

# Webサーバー起動（8082ポート - 競合回避）
python3 -m http.server 8082 &
WEB_PID=$!

sleep 3

# 5. アクセス確認
echo "🔍 サーバー起動確認中..."
curl -s http://localhost:5001/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ APIサーバー正常起動: http://localhost:5001"
else
    echo "❌ APIサーバー起動失敗"
fi

curl -s http://localhost:8082/index.html > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Webサーバー正常起動: http://localhost:8082"
else
    echo "❌ Webサーバー起動失敗"
fi

echo ""
echo "🎉 システム起動完了!"
echo ""
echo "📊 新しいアクセス先:"
echo "   🌐 フロントエンド: http://localhost:8082/index.html"
echo "   📡 API: http://localhost:5001"
echo ""
echo "🎯 新UIの特徴:"
echo "   ✅ 4つのタブ（利益計算、基本設定、送料マトリックス、一括処理）"
echo "   ✅ モダンなブルーテーマデザイン"
echo "   ✅ レスポンシブ対応"
echo "   ✅ Yahoo→eBay転売完全自動化"
echo ""
echo "🛑 停止方法:"
echo "   kill $API_PID $WEB_PID"

# PIDファイル保存
echo $API_PID > api.pid
echo $WEB_PID > web.pid

# ブラウザ自動起動（macOS）
echo ""
echo "🌐 ブラウザで自動起動中..."
open http://localhost:8082/index.html 2>/dev/null || echo "手動でブラウザを開いてください: http://localhost:8082/index.html"

echo ""
echo "💡 新UI確認方法:"
echo "   1. 上記URLにアクセス"
echo "   2. 新しいタブデザインが表示される"
echo "   3. 利益計算タブで仕入価格3000円、重量0.5kgで計算テスト"
