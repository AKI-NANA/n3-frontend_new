#!/bin/bash

echo "=== デバッグモードで起動 ==="
echo ""

# プロセスをクリーンアップ
pkill -9 -f "next" 2>/dev/null
sleep 2

# ポート3000をクリア
PORT_PID=$(lsof -ti :3000)
if [ ! -z "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi

sleep 1

echo "詳細ログモードで開発サーバーを起動します..."
echo "エラーが発生したら、ここに表示されます。"
echo ""

# 詳細ログで起動
NODE_ENV=development npm run dev 2>&1 | tee server-debug.log
