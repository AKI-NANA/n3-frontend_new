#!/bin/bash
# VPS側に配置: ~/deploy-webhook.sh

cd ~/n3-frontend_new

echo "📥 $(date): デプロイ開始"

# Gitから最新を取得
git fetch origin
git reset --hard origin/main

# 依存関係インストール
npm install

# ビルド
npm run build

# PM2再起動
pm2 restart n3-frontend || pm2 start npm --name "n3-frontend" -- start

echo "✅ $(date): デプロイ完了"
