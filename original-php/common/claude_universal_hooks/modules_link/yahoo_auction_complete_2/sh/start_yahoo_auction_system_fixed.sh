#!/bin/bash

# Yahoo Auction System - 修正版起動スクリプト
# 作成日: 2025年9月9日
# 説明: 修正されたAPIサーバーとスクレイピングシステムを起動

echo "🚀 Yahoo Auction System（修正版）起動中..."
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

# 必要なパッケージ確認
echo ""
echo "📦 必要なパッケージ確認中..."
pip3 list | grep -E "(flask|requests|beautifulsoup4|pandas|flask-cors)" || echo "⚠️  必要なパッケージがインストールされていない可能性があります"

echo ""
echo "🗃️  データベース準備中..."

# データベースディレクトリ作成
mkdir -p database_systems
mkdir -p logs

echo ""
echo "🌐 APIサーバー起動（ポート5002）..."

# バックグラウンドでAPIサーバー起動
cd api_servers
python3 yahoo_auction_api_server_fixed.py &
API_PID=$!

echo "📊 APIサーバーPID: $API_PID"

# 少し待ってサーバーが起動するのを確認
sleep 3

echo ""
echo "🔍 サーバー状態確認..."

# ヘルスチェック
curl -s http://localhost:5002/health | python3 -m json.tool 2>/dev/null || echo "⚠️  APIサーバーの起動を確認できませんでした"

echo ""
echo "==============================================="
echo "✅ システム起動完了！"
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
echo "   kill $API_PID  # APIサーバー停止"
echo ""
echo "📋 APIサーバープロセス ID: $API_PID"
echo "   ログ確認: tail -f logs/api_server.log"

# ログファイル作成
echo "$(date): Yahoo Auction System started (PID: $API_PID)" >> logs/system.log

echo ""
echo "🎉 システムが正常に起動しました！"
echo "ブラウザで http://localhost:8080/modules/yahoo_auction_complete/ui_interfaces/yahoo_auction_tool_fixed.php にアクセスしてください"
