#!/bin/bash

echo "=== N3 Frontend 緊急修復スクリプト ==="
echo ""

# 全てのNext.jsプロセスを強制終了
echo "1. 全てのNext.jsプロセスを強制終了中..."
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 2

# .nextディレクトリを完全削除
echo "2. .nextディレクトリを完全削除中..."
rm -rf .next

# node_modulesのキャッシュを完全削除
echo "3. node_modulesのキャッシュを完全削除中..."
rm -rf node_modules/.cache
rm -rf node_modules/.vite

# TypeScriptのキャッシュを削除
echo "4. TypeScriptキャッシュを削除中..."
rm -rf tsconfig.tsbuildinfo
rm -rf .tsbuildinfo

# 一時ファイルを削除
echo "5. 一時ファイルを削除中..."
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo ""
echo "=== クリーンアップ完了 ==="
echo ""
echo "開発サーバーを起動しています..."
echo ""

# 開発サーバーを起動
npm run dev
