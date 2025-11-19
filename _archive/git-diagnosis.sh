#!/bin/bash

echo "========================================="
echo "🔍 Git状態の完全診断"
echo "========================================="
echo ""

cd /Users/aritahiroaki/n3-frontend_new

echo "📊 Step 1: 現在のGit追跡ファイルを確認..."
echo ""
echo "--- .gitignore対象だが追跡されているファイル ---"
git ls-files -i --exclude-from=.gitignore | head -50

echo ""
echo "--- バックアップファイル（.bak） ---"
git ls-files | grep "\.bak$" | wc -l
git ls-files | grep "\.bak$" | head -20

echo ""
echo "--- オリジナルファイル（.original） ---"
git ls-files | grep "\.original$" | wc -l
git ls-files | grep "\.original$" | head -20

echo ""
echo "--- 旧ファイル（_old.tsx, _old.ts） ---"
git ls-files | grep "_old\.\(tsx\|ts\)$" | wc -l
git ls-files | grep "_old\.\(tsx\|ts\)$" | head -20

echo ""
echo "--- バックアップファイル（_backup.*） ---"
git ls-files | grep "_backup\." | wc -l
git ls-files | grep "_backup\." | head -20

echo ""
echo "--- _archive ディレクトリ ---"
git ls-files | grep "^_archive/" | wc -l
git ls-files | grep "^_archive/" | head -20

echo ""
echo "========================================="
echo "📋 .gitignore の内容確認"
echo "========================================="
echo ""
cat .gitignore | grep -E "(bak|original|old|backup|archive)" || echo "該当パターンなし"

echo ""
echo "========================================="
echo "📊 統計情報"
echo "========================================="
echo ""
echo "Git追跡ファイル総数: $(git ls-files | wc -l)"
echo "コミット数: $(git rev-list --count HEAD)"
echo "現在のブランチ: $(git branch --show-current)"
echo "リモートURL: $(git remote get-url origin)"

echo ""
echo "========================================="
echo "✅ 診断完了"
echo "========================================="
