#!/bin/bash

echo "=== N3 Frontend 完全再構築スクリプト ==="
echo ""

# プロセスを停止
echo "1. プロセスを停止中..."
pkill -9 -f "next" 2>/dev/null || true
sleep 2

# キャッシュを完全削除
echo "2. 全てのキャッシュを削除中..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf .turbo
rm -rf tsconfig.tsbuildinfo
rm -rf .tsbuildinfo

# package-lock.jsonを再生成
echo "3. package-lock.jsonを再生成中..."
rm -f package-lock.json
npm install

echo ""
echo "=== 再構築完了 ==="
echo ""
echo "開発サーバーを起動します..."
npm run dev
