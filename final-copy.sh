#!/bin/bash

echo "=== 動作確認済みのN3-Developmentから完全コピー ==="
echo ""

# 元のプロジェクトのプロセスを停止
pkill -9 -f "next" 2>/dev/null
sleep 2

SOURCE="/Users/aritahiroaki/n3-frontend_new/N3-Development/n3-frontend"
TARGET="/Users/aritahiroaki/n3-frontend_new"

cd "$TARGET"

echo "1. N3-Developmentからファイルをコピー中..."

# アプリケーションファイル
cp -r "$SOURCE/app" "$TARGET/"
cp -r "$SOURCE/components" "$TARGET/"
cp -r "$SOURCE/lib" "$TARGET/"
cp -r "$SOURCE/hooks" "$TARGET/" 2>/dev/null || true
cp -r "$SOURCE/types" "$TARGET/" 2>/dev/null || true
cp -r "$SOURCE/shared" "$TARGET/" 2>/dev/null || true

# 設定ファイル（package.jsonは除く）
cp "$SOURCE/tsconfig.json" "$TARGET/"
cp "$SOURCE/components.json" "$TARGET/"
cp "$SOURCE/postcss.config.mjs" "$TARGET/"

# next.config.tsは既に修正済みなのでスキップ

echo "2. キャッシュをクリア中..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "=== コピー完了 ==="
echo ""
echo "開発サーバーを起動します..."
npm run dev
