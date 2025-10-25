#!/bin/bash

# VPSデプロイスクリプト
# このスクリプトをVPS上で実行してください

set -e  # エラーが発生したら停止

echo "🚀 VPSへのデプロイを開始します..."

# プロジェクトディレクトリに移動
cd /home/ubuntu/n3-frontend_new

echo "📍 現在のディレクトリ: $(pwd)"

# 現在のブランチを確認
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"

# Gitから最新を取得
echo "1️⃣ Gitから最新データを取得中..."
git fetch origin

# 指定されたブランチをチェックアウト
DEPLOY_BRANCH="${1:-claude/fix-database-schema-011CUSEGuXMNhFc8xKiQv2DG}"
echo "2️⃣ ブランチをチェックアウト: $DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"

# 最新をpull
echo "3️⃣ 最新データをpull..."
git pull origin "$DEPLOY_BRANCH"

# 依存関係をインストール
echo "4️⃣ 依存関係をインストール中..."
PUPPETEER_SKIP_DOWNLOAD=true npm install

# ビルド
echo "5️⃣ アプリケーションをビルド中..."
npm run build

# PM2でアプリを再起動
echo "6️⃣ アプリケーションを再起動中..."
pm2 restart n3-frontend

echo ""
echo "✅ デプロイ完了！"
echo "🌐 https://n3.emverze.com で確認してください"
echo ""
echo "📋 ログ確認: pm2 logs n3-frontend --lines 50"
echo "📊 ステータス確認: pm2 status"
