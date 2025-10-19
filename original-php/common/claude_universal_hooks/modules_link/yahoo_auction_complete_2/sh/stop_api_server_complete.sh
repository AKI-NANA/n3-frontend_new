#!/bin/bash
# ===================================================
# Yahoo→eBay統合ワークフロー APIサーバー 停止スクリプト
# ===================================================

set -e

echo "🛑 Yahoo→eBay統合ワークフロー APIサーバー停止中..."

# 現在のディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# PIDファイル確認
if [ -f ".api_server.pid" ]; then
    SERVER_PID=$(cat .api_server.pid)
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo "サーバープロセス停止中: PID $SERVER_PID"
        kill $SERVER_PID
        
        # 停止確認
        for i in {1..10}; do
            if ! ps -p $SERVER_PID > /dev/null 2>&1; then
                echo "✅ サーバープロセス正常停止"
                break
            fi
            echo "停止待機中... ($i/10)"
            sleep 1
        done
        
        # 強制停止が必要な場合
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo "⚠️ 強制停止実行中..."
            kill -9 $SERVER_PID
            sleep 1
            if ! ps -p $SERVER_PID > /dev/null 2>&1; then
                echo "✅ 強制停止完了"
            else
                echo "❌ 停止失敗"
                exit 1
            fi
        fi
    else
        echo "⚠️ 指定されたPIDのプロセスは既に停止しています"
    fi
    
    # PIDファイル削除
    rm -f .api_server.pid
else
    echo "⚠️ PIDファイルが見つかりません"
fi

# ポート5001で動作中のプロセスを確認・停止
echo "🔍 ポート5001使用プロセス確認中..."
PIDS=$(lsof -ti:5001 2>/dev/null || true)

if [ -n "$PIDS" ]; then
    echo "ポート5001使用プロセス発見: $PIDS"
    for PID in $PIDS; do
        echo "プロセス停止中: $PID"
        kill $PID 2>/dev/null || true
        sleep 1
        if ! ps -p $PID > /dev/null 2>&1; then
            echo "✅ プロセス $PID 停止完了"
        else
            kill -9 $PID 2>/dev/null || true
            echo "⚠️ プロセス $PID 強制停止"
        fi
    done
else
    echo "ℹ️ ポート5001使用プロセスなし"
fi

echo ""
echo "====================================================="
echo "🎉 Yahoo→eBay統合ワークフロー APIサーバー 停止完了!"
echo "====================================================="
echo ""
echo "🔄 再起動する場合:"
echo "./start_api_server_complete.sh"
echo ""
