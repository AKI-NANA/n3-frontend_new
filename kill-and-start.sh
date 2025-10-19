#!/bin/bash

echo "=== ポートをクリーンアップして再起動 ==="
echo ""

# 全てのNext.jsプロセスを強制終了
echo "1. Next.jsプロセスを終了中..."
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "node.*next" 2>/dev/null

# ポート3000を使用しているプロセスを確認して終了
echo "2. ポート3000を使用しているプロセスを確認中..."
PORT_PID=$(lsof -ti :3000)
if [ ! -z "$PORT_PID" ]; then
  echo "   ポート3000を使用しているプロセス(PID: $PORT_PID)を終了中..."
  kill -9 $PORT_PID 2>/dev/null
else
  echo "   ポート3000は空いています"
fi

sleep 2

echo ""
echo "3. 開発サーバーを起動します..."
echo ""

# 開発サーバーを起動
npm run dev
