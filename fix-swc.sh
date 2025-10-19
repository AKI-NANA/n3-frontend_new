#!/bin/bash

echo "=== Next.js SWC依存関係の修復 ==="
echo ""

# プロセスを停止
echo "1. Next.jsプロセスを停止中..."
pkill -9 -f "next" 2>/dev/null || true
sleep 1

# npm installを実行（swc依存関係をインストール）
echo "2. SWC依存関係をインストール中..."
npm install

echo ""
echo "=== 修復完了 ==="
echo ""
echo "開発サーバーを起動します..."
echo ""

# 開発サーバーを起動
PORT=3000 npm run dev
