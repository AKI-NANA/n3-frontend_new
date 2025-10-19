#!/bin/bash

echo "=== N3-Development からファイルをコピー ==="
echo ""

# プロセスを停止
pkill -9 -f "next" 2>/dev/null

# 現在のファイルをバックアップ
echo "1. 現在のファイルをバックアップ中..."
cp -r /Users/aritahiroaki/n3-frontend_new /Users/aritahiroaki/n3-frontend_new_backup_$(date +%Y%m%d_%H%M%S)

# N3-Developmentから主要ファイルをコピー
echo "2. N3-Developmentから主要ファイルをコピー中..."
SOURCE="/Users/aritahiroaki/n3-frontend_new/N3-Development/n3-frontend"
TARGET="/Users/aritahiroaki/n3-frontend_new"

# アプリケーションファイル
cp -r "$SOURCE/app" "$TARGET/"
cp -r "$SOURCE/components" "$TARGET/"
cp -r "$SOURCE/lib" "$TARGET/"
cp -r "$SOURCE/hooks" "$TARGET/" 2>/dev/null || true

# 設定ファイル
cp "$SOURCE/next.config.ts" "$TARGET/" 2>/dev/null || true
cp "$SOURCE/tsconfig.json" "$TARGET/" 2>/dev/null || true
cp "$SOURCE/components.json" "$TARGET/" 2>/dev/null || true
cp "$SOURCE/postcss.config.mjs" "$TARGET/" 2>/dev/null || true

echo "3. .nextとnode_modules/.cacheを削除..."
rm -rf "$TARGET/.next"
rm -rf "$TARGET/node_modules/.cache"

echo ""
echo "=== コピー完了 ==="
echo ""
echo "開発サーバーを起動します..."
cd "$TARGET"
npm run dev
