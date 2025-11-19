#!/bin/bash

echo "========================================="
echo "🔍 GitHub上の不要ファイル確認"
echo "========================================="
echo ""

cd /Users/aritahiroaki/n3-frontend_new

echo "📂 GitHub上に残っている可能性のあるファイル/ディレクトリ:"
echo ""

# GitHub上のファイルリストを取得
git ls-tree -r --name-only origin/main > /tmp/github_files.txt 2>/dev/null

# 不要なパターンを検索
echo "--- _archive ディレクトリ ---"
grep "^_archive/" /tmp/github_files.txt | head -20
ARCHIVE_COUNT=$(grep "^_archive/" /tmp/github_files.txt | wc -l)
echo "合計: ${ARCHIVE_COUNT}件"
echo ""

echo "--- .bak ファイル ---"
grep "\.bak$" /tmp/github_files.txt | head -20
BAK_COUNT=$(grep "\.bak$" /tmp/github_files.txt | wc -l)
echo "合計: ${BAK_COUNT}件"
echo ""

echo "--- .original ファイル ---"
grep "\.original$" /tmp/github_files.txt | head -20
ORIGINAL_COUNT=$(grep "\.original$" /tmp/github_files.txt | wc -l)
echo "合計: ${ORIGINAL_COUNT}件"
echo ""

echo "--- *_old.* ファイル ---"
grep "_old\.\(tsx\|ts\|js\)$" /tmp/github_files.txt | head -20
OLD_COUNT=$(grep "_old\.\(tsx\|ts\|js\)$" /tmp/github_files.txt | wc -l)
echo "合計: ${OLD_COUNT}件"
echo ""

echo "--- *_backup.* ファイル ---"
grep "_backup\." /tmp/github_files.txt | head -20
BACKUP_COUNT=$(grep "_backup\." /tmp/github_files.txt | wc -l)
echo "合計: ${BACKUP_COUNT}件"
echo ""

TOTAL=$((ARCHIVE_COUNT + BAK_COUNT + ORIGINAL_COUNT + OLD_COUNT + BACKUP_COUNT))
echo "========================================="
echo "📊 合計: ${TOTAL}件の不要ファイルがGitHub上に存在"
echo "========================================="
echo ""

if [ $TOTAL -eq 0 ]; then
    echo "✅ GitHubは既にクリーンな状態です"
else
    echo "⚠️ これらのファイルをGitHubから削除する必要があります"
fi
