#!/bin/bash

echo "========================================="
echo "🗑️  VPS クリーンアップスクリプト"
echo "========================================="
echo ""
echo "⚠️  警告：このスクリプトは以下のファイルを削除します："
echo "  - *.bak"
echo "  - *.original"
echo "  - *_old.tsx, *_old.ts"
echo "  - *_backup.tsx, *_backup.ts"
echo "  - _archive/ ディレクトリ"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

echo ""
echo "📊 削除前の状態確認..."
echo ""

# バックアップファイルの数を確認
echo "--- バックアップファイル (.bak) ---"
find . -name "*.bak" -type f | wc -l
echo ""

echo "--- オリジナルファイル (.original) ---"
find . -name "*.original" -type f | wc -l
echo ""

echo "--- 旧ファイル (*_old.tsx, *_old.ts) ---"
find . -name "*_old.tsx" -o -name "*_old.ts" | wc -l
echo ""

echo "--- バックアップファイル (*_backup.*) ---"
find . -name "*_backup.*" -type f | wc -l
echo ""

echo "--- アーカイブディレクトリ ---"
if [ -d "_archive" ]; then
    echo "_archive/ ディレクトリが存在します"
else
    echo "_archive/ ディレクトリは存在しません"
fi
echo ""

echo "========================================="
echo "🗑️  クリーンアップ開始..."
echo "========================================="
echo ""

# 1. .bak ファイルを削除
echo "1. .bak ファイルを削除中..."
find . -name "*.bak" -type f -delete
echo "   ✅ 完了"

# 2. .original ファイルを削除
echo "2. .original ファイルを削除中..."
find . -name "*.original" -type f -delete
echo "   ✅ 完了"

# 3. *_old.tsx, *_old.ts ファイルを削除
echo "3. *_old.tsx, *_old.ts ファイルを削除中..."
find . -name "*_old.tsx" -type f -delete
find . -name "*_old.ts" -type f -delete
echo "   ✅ 完了"

# 4. *_backup.* ファイルを削除
echo "4. *_backup.* ファイルを削除中..."
find . -name "*_backup.*" -type f -delete
echo "   ✅ 完了"

# 5. _archive ディレクトリを削除
echo "5. _archive/ ディレクトリを削除中..."
if [ -d "_archive" ]; then
    rm -rf _archive
    echo "   ✅ 完了"
else
    echo "   ⏭️  スキップ（存在しません）"
fi

# 6. node_modules と .next を削除（再生成のため）
echo "6. node_modules/ と .next/ を削除中..."
rm -rf node_modules .next
echo "   ✅ 完了"

echo ""
echo "========================================="
echo "✅ クリーンアップ完了"
echo "========================================="
echo ""
echo "📊 削除後の確認..."
echo ""

# 残っているバックアップファイルを確認
REMAINING_BAK=$(find . -name "*.bak" -type f | wc -l)
REMAINING_ORIGINAL=$(find . -name "*.original" -type f | wc -l)
REMAINING_OLD=$(find . -name "*_old.*" -type f | wc -l)
REMAINING_BACKUP=$(find . -name "*_backup.*" -type f | wc -l)

echo "残存ファイル:"
echo "  - .bak: ${REMAINING_BAK}件"
echo "  - .original: ${REMAINING_ORIGINAL}件"
echo "  - *_old.*: ${REMAINING_OLD}件"
echo "  - *_backup.*: ${REMAINING_BACKUP}件"
echo ""

if [ $((REMAINING_BAK + REMAINING_ORIGINAL + REMAINING_OLD + REMAINING_BACKUP)) -eq 0 ]; then
    echo "✅ 全ての不要ファイルが削除されました"
else
    echo "⚠️  一部のファイルが残っています"
fi

echo ""
echo "🚀 次のステップ:"
echo "  1. npm install"
echo "  2. npm run build"
echo "  3. pm2 restart n3-frontend"
echo ""
