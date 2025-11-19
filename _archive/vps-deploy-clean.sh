#!/bin/bash

echo "========================================="
echo "🧹 VPS完全クリーンデプロイスクリプト"
echo "========================================="
echo ""
echo "⚠️  警告: このスクリプトは全ファイルを削除して再クローンします"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

PROJECT_DIR=~/n3-frontend_new
BACKUP_DIR=~/n3-frontend_new.backup.$(date +%Y%m%d_%H%M%S)

echo ""
echo "========================================="
echo "📦 Phase 1: バックアップ作成"
echo "========================================="
echo ""

if [ -d "$PROJECT_DIR" ]; then
    echo "バックアップ中: ${PROJECT_DIR} → ${BACKUP_DIR}"
    cp -r $PROJECT_DIR $BACKUP_DIR
    
    # .env をバックアップ
    if [ -f "$PROJECT_DIR/.env" ]; then
        cp $PROJECT_DIR/.env $BACKUP_DIR/.env.backup
        echo "✅ .env をバックアップしました"
    fi
    
    echo "✅ バックアップ完了: ${BACKUP_DIR}"
else
    echo "⏭️  プロジェクトディレクトリが存在しないのでバックアップをスキップ"
fi

echo ""
echo "========================================="
echo "🗑️  Phase 2: 既存ディレクトリを完全削除"
echo "========================================="
echo ""

if [ -d "$PROJECT_DIR" ]; then
    echo "削除中: ${PROJECT_DIR}"
    rm -rf $PROJECT_DIR
    echo "✅ 削除完了"
else
    echo "⏭️  既に存在しません"
fi

echo ""
echo "========================================="
echo "📥 Phase 3: GitHubから完全クローン"
echo "========================================="
echo ""

cd ~
echo "クローン中..."
git clone https://github.com/YOUR_USERNAME/n3-frontend_new.git

if [ $? -ne 0 ]; then
    echo "❌ エラー: git clone に失敗しました"
    echo ""
    echo "🔄 ロールバックしますか？"
    read -p "(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mv $BACKUP_DIR $PROJECT_DIR
        echo "✅ ロールバック完了"
    fi
    exit 1
fi

cd $PROJECT_DIR
echo "✅ クローン完了"

echo ""
echo "========================================="
echo "🔧 Phase 4: 環境設定の復元"
echo "========================================="
echo ""

if [ -f "$BACKUP_DIR/.env.backup" ]; then
    echo ".env を復元中..."
    cp $BACKUP_DIR/.env.backup $PROJECT_DIR/.env
    echo "✅ .env 復元完了"
else
    echo "⚠️  .env のバックアップが見つかりません"
    echo "手動で .env を作成してください"
    echo ""
    read -p "Enter キーを押して続行..."
fi

echo ""
echo "========================================="
echo "📦 Phase 5: 依存関係のインストール"
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
echo "🔨 Phase 6: 本番ビルド"
echo "========================================="
echo ""

npm run build

if [ $? -ne 0 ]; then
    echo "❌ エラー: npm run build に失敗しました"
    echo ""
    echo "🔄 ロールバックしますか？"
    read -p "(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd ~
        rm -rf $PROJECT_DIR
        mv $BACKUP_DIR $PROJECT_DIR
        cd $PROJECT_DIR
        pm2 restart n3-frontend
        echo "✅ ロールバック完了"
    fi
    exit 1
fi

echo "✅ ビルド完了"

echo ""
echo "========================================="
echo "🚀 Phase 7: PM2再起動"
echo "========================================="
echo ""

pm2 list

# PM2再起動
pm2 restart n3-frontend

if [ $? -ne 0 ]; then
    echo "⚠️  PM2プロセスが存在しません。新規作成します..."
    pm2 start npm --name "n3-frontend" -- start
    pm2 save
fi

echo "✅ PM2再起動完了"

echo ""
echo "========================================="
echo "🔍 Phase 8: 動作確認"
echo "========================================="
echo ""

echo "アプリケーション起動を待機中（10秒）..."
sleep 10

echo ""
echo "--- PM2ログ（最新20行）---"
pm2 logs n3-frontend --lines 20 --nostream

echo ""
echo "--- ローカルアクセステスト ---"
curl -I http://localhost:3000

echo ""
echo "========================================="
echo "✅ 完全クリーンデプロイ完了"
echo "========================================="
echo ""
echo "📊 現在の状態:"
echo "  - プロジェクト: ${PROJECT_DIR}"
echo "  - バックアップ: ${BACKUP_DIR}"
echo "  - Git状態: 完全にGitHubと一致"
echo ""
echo "🧹 クリーンアップ（古いバックアップ削除）:"
echo "  rm -rf ${BACKUP_DIR}"
echo ""
echo "🔄 ロールバック方法:"
echo "  cd ~"
echo "  rm -rf n3-frontend_new"
echo "  mv ${BACKUP_DIR} n3-frontend_new"
echo "  cd n3-frontend_new"
echo "  pm2 restart n3-frontend"
echo ""
