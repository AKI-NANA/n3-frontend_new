#!/bin/bash

echo "=== N3 Frontend クリーンビルドスクリプト ==="
echo ""

# .nextディレクトリを削除
echo "1. .nextディレクトリを削除中..."
rm -rf .next

# node_modules/.cacheを削除
echo "2. node_modules/.cacheを削除中..."
rm -rf node_modules/.cache

echo "3. ビルドキャッシュのクリア完了"
echo ""
echo "次のコマンドで開発サーバーを起動してください:"
echo "npm run dev"
