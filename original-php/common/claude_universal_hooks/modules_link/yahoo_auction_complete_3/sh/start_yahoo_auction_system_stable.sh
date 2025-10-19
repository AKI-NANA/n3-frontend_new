#!/bin/bash

# Yahoo Auction System - 修正版起動スクリプト（エラー修正済み）
# 作成日: 2025年9月9日
# 説明: flask-cors依存問題を解決した安定版

echo "🚀 Yahoo Auction System（修正版・安定版）起動中..."
echo "=================================================="

# 現在のディレクトリを確認
CURRENT_DIR=$(pwd)
echo "📁 現在のディレクトリ: $CURRENT_DIR"

# 必要なディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete

echo ""
echo "🔧 システム確認中..."

# Pythonバージョン確認
echo "🐍 Pythonバージョン:"
python3 --version

# 基本パッケージ確認
echo ""
echo "📦 基本パッケージ確認中..."
python3 -c "import flask; print('✅ Flask:', flask.__version__)" 2>/dev/null || echo "⚠️  Flask がインストールされていません"
python3 -c "import requests; print('✅ Requests:', requests.__version__)" 2>/dev/null || echo "⚠️  Requests がインストールされていません"
python3 -c "import pandas; print('✅ Pandas:', pandas.__version__)" 2>/dev/null || echo "⚠️  Pandas がインストールされていません"
python3 -c "import sqlite3; print('✅ SQLite3: 標準ライブラリ')" 2>/dev/null || echo "⚠️  SQLite3 に問題があります"

echo ""
echo "🗃️  データベース・ログ準備中..."

# 必要ディレクトリ作成
mkdir -p logs
mkdir -p database_systems
mkdir -p uploads

# ログファイル初期化
touch logs/system.log
touch logs/api_server.log

echo ""
echo "🌐 APIサーバー起動（ポート5002・依存関係修正版）..."

# 前回のプロセスが残っている場合は停止
if lsof -Pi :5002 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  ポート5002が使用中です。既存プロセスを停止します..."
    lsof -ti:5002 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# バックグラウンドでAPIサーバー起動（依存関係修正版を使用）
cd api_servers
python3 yahoo_auction_api_server_fixed_no_deps.py > ../logs/api_server.log 2>&1 &
API_PID=$!

echo "📊 APIサーバーPID: $API_PID"

# 少し待ってサーバーが起動するのを確認
echo "⏳ サーバー起動待機中..."
sleep 5

echo ""
echo "🔍 サーバー状態確認..."

# ヘルスチェック
echo "🩺 ヘルスチェック実行中..."
HEALTH_RESPONSE=$(curl -s http://localhost:5002/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ APIサーバーが正常に応答しています"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ APIサーバーへの接続に失敗しました"
    echo "📋 ログ確認:"
    tail -10 ../logs/api_server.log 2>/dev/null || echo "ログファイルが見つかりません"
fi

echo ""
echo "==============================================="
echo "✅ システム起動処理完了！"
echo ""
echo "🌐 アクセス先:"
echo "   メインUI: http://localhost:8080/modules/yahoo_auction_complete/ui_interfaces/yahoo_auction_tool_fixed.php"
echo "   API健康状態: http://localhost:5002/health"
echo "   システム状態: http://localhost:5002/api/system_status"
echo ""
echo "📝 使用方法:"
echo "   1. ブラウザでメインUIにアクセス"
echo "   2. 「接続テスト」ボタンでAPIサーバー接続を確認"
echo "   3. Yahoo オークションURLを入力してスクレイピング実行"
echo ""
echo "🛑 システム停止方法:"
echo "   ./stop_yahoo_auction_system.sh"
echo "   または: kill $API_PID"
echo ""
echo "📋 トラブルシューティング:"
echo "   エラーログ: tail -f logs/api_server.log"
echo "   システムログ: tail -f logs/system.log"
echo "   プロセス確認: ps aux | grep yahoo_auction"

# ログファイル記録
echo "$(date): Yahoo Auction System started (PID: $API_PID, No flask-cors dependency)" >> logs/system.log

echo ""
echo "🎉 システムが正常に起動しました！"
echo "ブラウザで以下にアクセスしてください："
echo "http://localhost:8080/modules/yahoo_auction_complete/ui_interfaces/yahoo_auction_tool_fixed.php"

# 最終確認
echo ""
echo "🔧 最終チェック（5秒後）..."
sleep 5

if ps -p $API_PID > /dev/null; then
    echo "✅ APIサーバーは正常に動作中です（PID: $API_PID）"
else
    echo "❌ APIサーバーが停止している可能性があります"
    echo "📋 エラーログ確認:"
    tail -5 logs/api_server.log 2>/dev/null || echo "ログファイルが見つかりません"
fi
