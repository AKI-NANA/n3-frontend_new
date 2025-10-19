#!/bin/bash
# APIサーバー緊急修復・再起動スクリプト

echo "🚨 APIサーバー緊急修復・再起動"
echo "================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool

echo "📋 1. 既存プロセス確認・停止..."
pkill -f "enhanced_complete_api_updated.py" && echo "✅ 既存プロセス停止" || echo "ℹ️ 既存プロセスなし"

echo "📋 2. ポート確認..."
lsof -i :5001 | grep -v PID && echo "⚠️ ポート5001使用中" || echo "✅ ポート5001利用可能"

echo "📋 3. 仮想環境セットアップ..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 仮想環境作成完了"
fi

source venv/bin/activate
echo "✅ 仮想環境有効化"

echo "📋 4. 必要ライブラリインストール..."
pip install flask flask-cors pandas requests --quiet
echo "✅ ライブラリインストール完了"

echo "📋 5. データベース確認..."
if [ -f "yahoo_ebay_workflow_enhanced.db" ]; then
    echo "✅ データベースファイル存在"
else
    echo "ℹ️ データベースファイル新規作成予定"
fi

echo "📋 6. APIサーバー起動..."
echo "   ポート: 5001"
echo "   ヘルス: http://localhost:5001/health"
echo "   データ: http://localhost:5001/api/get_all_data"
echo ""

# 起動ログを表示しながら実行
python3 enhanced_complete_api_updated.py &
SERVER_PID=$!

echo "🆔 サーバーPID: $SERVER_PID"
echo "⏳ 起動待機中..."
sleep 5

# ヘルスチェック
echo "📋 7. 動作確認..."
for i in {1..10}; do
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo "✅ ヘルスチェック成功"
        break
    else
        echo "⏳ 接続試行 $i/10..."
        sleep 2
    fi
done

# データエンドポイント確認
if curl -s http://localhost:5001/api/get_all_data > /dev/null 2>&1; then
    echo "✅ データエンドポイント確認"
else
    echo "❌ データエンドポイント未確認"
fi

echo ""
echo "🎉 緊急修復完了!"
echo "================================"
echo "🌐 フロントエンド: http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php"
echo "🔍 API確認: http://localhost:5001/health"
echo "📊 データ確認: http://localhost:5001/api/get_all_data"
echo "🔧 停止: kill $SERVER_PID"
echo ""
echo "▶️ ブラウザでフロントエンドをリロードして「データ読込」ボタンをお試しください"
