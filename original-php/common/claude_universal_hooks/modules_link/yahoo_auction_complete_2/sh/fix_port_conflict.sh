#!/bin/bash
# 🔧 ポート競合解決スクリプト

echo "🔍 ポート5000使用状況確認"
echo "================================="

# ポート5000を使用中のプロセス確認
echo "ポート5000を使用中のプロセス:"
lsof -i :5000

echo ""
echo "🛑 AirPlay Receiver確認"
echo "macOSのAirPlay Receiverが5000番ポートを使用している可能性があります"

echo ""
echo "🔧 解決方法オプション:"
echo "1. AirPlay Receiverを無効化（推奨）"
echo "2. 別ポートでAPIサーバー起動"

echo ""
echo "📋 Option 1: AirPlay Receiver無効化手順"
echo "システム設定 → 一般 → AirDropとHandoff → AirPlayレシーバー をオフ"

echo ""
echo "📋 Option 2: 別ポート使用（即座に解決）"
echo "APIサーバーをポート5001で起動します"

# ポート5001の使用状況確認
echo ""
echo "ポート5001使用状況:"
lsof -i :5001

if [ $? -eq 0 ]; then
    echo "⚠️ ポート5001も使用中です"
    echo "ポート5002を試します"
    
    echo "ポート5002使用状況:"
    lsof -i :5002
    
    if [ $? -eq 0 ]; then
        echo "⚠️ ポート5002も使用中です"
        echo "ランダムポートを使用します"
    else
        echo "✅ ポート5002は使用可能です"
        AVAILABLE_PORT=5002
    fi
else
    echo "✅ ポート5001は使用可能です"
    AVAILABLE_PORT=5001
fi

# ランダムポート生成（必要な場合）
if [ -z "$AVAILABLE_PORT" ]; then
    AVAILABLE_PORT=$((RANDOM % 1000 + 5003))
    echo "🎲 ランダムポート: $AVAILABLE_PORT を使用します"
fi

echo ""
echo "🚀 解決策: ポート $AVAILABLE_PORT でAPIサーバー起動"
echo "次のコマンドを実行してください:"
echo "python3 api_server_complete.py --port $AVAILABLE_PORT"

# 環境変数設定
export YAHOO_API_PORT=$AVAILABLE_PORT
echo "export YAHOO_API_PORT=$AVAILABLE_PORT" >> ~/.zshrc

echo ""
echo "✅ ポート設定完了: $AVAILABLE_PORT"
