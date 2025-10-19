#!/bin/bash

echo "=== SWC依存関係の完全な再インストール ==="
echo ""

# プロセスを停止
echo "1. Next.jsプロセスを停止中..."
pkill -9 -f "next" 2>/dev/null
sleep 2

# ポート3000をクリア
PORT_PID=$(lsof -ti :3000)
if [ ! -z "$PORT_PID" ]; then
  echo "2. ポート3000のプロセス(PID: $PORT_PID)を終了中..."
  kill -9 $PORT_PID 2>/dev/null
fi

# 完全削除
echo "3. node_modules, package-lock.json, .nextを削除中..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .next
rm -rf .turbo
rm -rf node_modules/.cache

echo "4. 依存関係を再インストール中（数分かかります）..."
npm install

echo ""
echo "=== 再インストール完了 ==="
echo ""
echo "5. 開発サーバーを起動します..."
echo ""

npm run dev
