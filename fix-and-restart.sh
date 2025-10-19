#!/bin/bash

echo "=== N3 Frontend 完全修復スクリプト ==="
echo ""

# 開発サーバーを停止
echo "1. 既存のNext.jsプロセスを停止中..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# .nextディレクトリを削除
echo "2. .nextディレクトリを削除中..."
rm -rf .next

# node_modules/.cacheを削除
echo "3. node_modules/.cacheを削除中..."
rm -rf node_modules/.cache

# TypeScriptのキャッシュを削除
echo "4. TypeScriptキャッシュを削除中..."
rm -rf tsconfig.tsbuildinfo

echo ""
echo "=== クリーンアップ完了 ==="
echo ""
echo "次のコマンドで開発サーバーを起動してください:"
echo "npm run dev"
echo ""
echo "その後、ブラウザで http://localhost:3000/ を開き、"
echo "Cmd+Shift+R (Mac) または Ctrl+Shift+R (Windows) で完全リロードしてください。"
