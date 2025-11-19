#!/bin/bash

echo "========================================="
echo "🚀 VPS完全デプロイスクリプト"
echo "========================================="
echo ""
echo "このスクリプトは以下を実行します："
echo "  1. 不要ファイルのクリーンアップ"
echo "  2. 最新コードの取得"
echo "  3. 依存関係のインストール"
echo "  4. 本番ビルド"
echo "  5. PM2再起動"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

# プロジェクトディレクトリを確認
if [ ! -d "~/n3-frontend_new" ]; then
    echo "❌ エラー: ~/n3-frontend_new が見つかりません"
    exit 1
fi

cd ~/n3-frontend_new

echo ""
echo "========================================="
echo "📦 Phase 1: バックアップ作成"
echo "========================================="
echo ""

BACKUP_DIR=~/n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)
echo "バックアップディレクトリ: ${BACKUP_DIR}"
cp -r ~/n3-frontend_new ${BACKUP_DIR}
echo "✅ バックアップ完了"

echo ""
echo "========================================="
echo "🗑️  Phase 2: 不要ファイルの削除"
echo "========================================="
echo ""

# .bak ファイルを削除
echo "1. .bak ファイルを削除中..."
find . -name "*.bak" -type f -delete
echo "   ✅ 完了"

# .original ファイルを削除
echo "2. .original ファイルを削除中..."
find . -name "*.original" -type f -delete
echo "   ✅ 完了"

# *_old.tsx, *_old.ts ファイルを削除
echo "3. *_old.tsx, *_old.ts ファイルを削除中..."
find . -name "*_old.tsx" -type f -delete
find . -name "*_old.ts" -type f -delete
echo "   ✅ 完了"

# *_backup.* ファイルを削除
echo "4. *_backup.* ファイルを削除中..."
find . -name "*_backup.*" -type f -delete
echo "   ✅ 完了"

# _archive ディレクトリを削除
echo "5. _archive/ ディレクトリを削除中..."
if [ -d "_archive" ]; then
    rm -rf _archive
    echo "   ✅ 完了"
else
    echo "   ⏭️  スキップ（存在しません）"
fi

# node_modules と .next を削除
echo "6. node_modules/ と .next/ を削除中..."
rm -rf node_modules .next
echo "   ✅ 完了"

echo ""
echo "========================================="
echo "📥 Phase 3: 最新コードの取得"
echo "========================================="
echo ""

# Gitの状態を確認
git status

# ローカル変更があればスタッシュ
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  ローカル変更を検出しました。スタッシュします..."
    git stash
fi

# 最新コードを取得
echo "GitHubから最新コードを取得中..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ エラー: git pull に失敗しました"
    exit 1
fi

echo "✅ 最新コード取得完了"

echo ""
echo "========================================="
echo "📦 Phase 4: 依存関係のインストール"
echo "========================================="
echo ""

npm install

if [ $? -ne 0 ]; then
    echo "❌ エラー: npm install に失敗しました"
    exit 1
fi

echo "✅ 依存関係インストール完了"

echo ""
echo "========================================="
echo "🔨 Phase 5: 本番ビルド"
echo "========================================="
echo ""

npm run build

if [ $? -ne 0 ]; then
    echo "❌ エラー: npm run build に失敗しました"
    echo ""
    echo "ロールバックしますか？"
    read -p "(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "ロールバック中..."
        cd ~
        rm -rf n3-frontend_new
        mv ${BACKUP_DIR} n3-frontend_new
        cd n3-frontend_new
        pm2 restart n3-frontend
        echo "✅ ロールバック完了"
    fi
    exit 1
fi

echo "✅ ビルド完了"

echo ""
echo "========================================="
echo "🚀 Phase 6: PM2再起動"
echo "========================================="
echo ""

# PM2プロセスを確認
pm2 list

# PM2再起動
pm2 restart n3-frontend

if [ $? -ne 0 ]; then
    echo "⚠️  PM2再起動に失敗しました。プロセスを再作成します..."
    pm2 delete n3-frontend
    pm2 start npm --name "n3-frontend" -- start
    pm2 save
fi

echo "✅ PM2再起動完了"

echo ""
echo "========================================="
echo "🔍 Phase 7: 動作確認"
echo "========================================="
echo ""

# 10秒待機
echo "アプリケーション起動を待機中（10秒）..."
sleep 10

# PM2ログを確認
echo ""
echo "--- PM2ログ（最新20行）---"
pm2 logs n3-frontend --lines 20 --nostream

echo ""
echo "--- ローカルアクセステスト ---"
curl -I http://localhost:3000

echo ""
echo "========================================="
echo "✅ デプロイ完了"
echo "========================================="
echo ""
echo "📊 確認事項:"
echo "  - PM2ステータス: pm2 list"
echo "  - ログ確認: pm2 logs n3-frontend"
echo "  - ブラウザ確認: https://n3.emverze.com"
echo ""
echo "💾 バックアップ保存先:"
echo "  ${BACKUP_DIR}"
echo ""
echo "🔄 ロールバック方法:"
echo "  cd ~"
echo "  rm -rf n3-frontend_new"
echo "  mv ${BACKUP_DIR} n3-frontend_new"
echo "  cd n3-frontend_new"
echo "  pm2 restart n3-frontend"
echo ""
