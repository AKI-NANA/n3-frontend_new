#!/bin/bash

echo "🔧 Webpack publicPath エラーを修正中..."

# Next.jsのビルドキャッシュを削除
echo "📁 .next ディレクトリを削除中..."
rm -rf .next

# node_modules/.cache を削除
echo "📁 node_modules/.cache を削除中..."
rm -rf node_modules/.cache

# ブラウザのキャッシュをクリアするよう指示
echo "🌐 ブラウザのキャッシュもクリアしてください（Cmd+Shift+R または Ctrl+Shift+R）"

echo ""
echo "✅ キャッシュクリア完了!"
echo ""
echo "次のコマンドで開発サーバーを起動してください:"
echo "pnpm dev"
echo ""
