#!/bin/bash

echo "========================================="
echo "💾 リポジトリを完全バックアップ"
echo "========================================="
echo ""

BACKUP_NAME="n3-frontend_new_backup_$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$HOME/$BACKUP_NAME"

echo "📦 バックアップ先: $BACKUP_PATH"
echo ""

read -p "バックアップを作成しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

echo ""
echo "📋 バックアップ中..."
echo "  元: ~/n3-frontend_new"
echo "  先: $BACKUP_PATH"
echo ""

# .gitディレクトリも含めて完全コピー
cp -r ~/n3-frontend_new "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ バックアップ完了！"
    echo ""
    echo "📊 バックアップサイズ:"
    du -sh "$BACKUP_PATH"
    echo ""
    echo "📂 バックアップ場所:"
    echo "  $BACKUP_PATH"
    echo ""
    echo "💡 復元方法:"
    echo "  cd ~"
    echo "  rm -rf n3-frontend_new"
    echo "  mv $BACKUP_NAME n3-frontend_new"
    echo ""
else
    echo ""
    echo "❌ バックアップ失敗"
    exit 1
fi
