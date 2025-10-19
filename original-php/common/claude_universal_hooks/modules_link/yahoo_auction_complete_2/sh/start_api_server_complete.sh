#!/bin/bash
# ===================================================
# Yahoo→eBay統合ワークフロー APIサーバー 起動スクリプト
# ===================================================

set -e

echo "🚀 Yahoo→eBay統合ワークフロー APIサーバー起動中..."

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ログディレクトリ作成
mkdir -p logs
mkdir -p yahoo_ebay_data

# Python仮想環境確認・作成
if [ ! -d "venv" ]; then
    echo "📦 Python仮想環境作成中..."
    python3 -m venv venv
fi

# 仮想環境有効化
echo "🔧 仮想環境有効化..."
source venv/bin/activate

# 依存関係インストール
echo "📥 依存関係インストール中..."
pip install --upgrade pip
pip install -r requirements_api_server.txt

# 既存サーバープロセス停止
echo "🛑 既存サーバープロセス停止中..."
if [ -f ".api_server.pid" ]; then
    OLD_PID=$(cat .api_server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "停止中のプロセス: $OLD_PID"
        kill $OLD_PID
        sleep 2
    fi
    rm -f .api_server.pid
fi

# サーバー起動
echo "🌟 APIサーバー起動中..."
echo "ポート: 5001"
echo "API URL: http://localhost:5001"
echo "ログ: logs/api_server.log"

# バックグラウンドでサーバー起動
nohup python3 api_server_complete_v2.py > logs/api_server.log 2>&1 &
SERVER_PID=$!

# PIDファイル保存
echo $SERVER_PID > .api_server.pid

# 起動確認
sleep 3
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ APIサーバー起動成功!"
    echo "PID: $SERVER_PID"
    echo ""
    echo "📋 接続確認:"
    echo "curl http://localhost:5001/system_status"
    echo ""
    echo "🌐 フロントエンド起動:"
    echo "open http://localhost:8080/modules/yahoo_auction_tool/index.php"
    echo ""
    echo "📊 リアルタイムログ監視:"
    echo "tail -f logs/api_server.log"
else
    echo "❌ APIサーバー起動失敗"
    echo "ログを確認してください: logs/api_server.log"
    exit 1
fi

# 接続テスト
echo "🔍 接続テスト実行中..."
sleep 2

if curl -s http://localhost:5001/system_status > /dev/null; then
    echo "✅ 接続テスト成功"
else
    echo "⚠️ 接続テストに時間がかかっています（正常な場合があります）"
fi

echo ""
echo "====================================================="
echo "🎉 Yahoo→eBay統合ワークフロー APIサーバー 起動完了!"
echo "====================================================="
echo ""
echo "📡 API URL: http://localhost:5001"
echo "📁 データベース: yahoo_ebay_data/complete_database.db"
echo "📜 ログファイル: logs/api_server.log"
echo "🆔 サーバーPID: $SERVER_PID"
echo ""
echo "🛠️ 管理コマンド:"
echo "・サーバー停止: kill $SERVER_PID"
echo "・ログ監視: tail -f logs/api_server.log"
echo "・再起動: ./start_api_server_complete.sh"
echo ""
