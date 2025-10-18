#!/bin/bash

# 既存のプロセスを停止
echo "🛑 既存のプロセスを停止中..."
lsof -ti:3003 | xargs kill -9 2>/dev/null || echo "停止するプロセスはありません"

# ディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/n3-frontend

# サーバー起動
echo "🚀 サーバーを起動中..."
npm run dev

# もしエラーが出た場合
if [ $? -ne 0 ]; then
    echo "❌ エラーが発生しました"
    echo "📝 package.jsonを確認してください"
    exit 1
fi
