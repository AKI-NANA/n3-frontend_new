#!/bin/bash

# Git履歴から機密情報を完全に削除するスクリプト

echo "=== Git履歴クリーンアップ開始 ==="

# 1. Gitキャッシュをクリア
echo "1. Gitキャッシュをクリア中..."
git rm -r --cached scripts/ 2>/dev/null || true
git rm --cached .env* 2>/dev/null || true

# 2. すべての変更をコミット
echo "2. .gitignore更新をコミット中..."
git add .gitignore
git commit -m "chore: Update .gitignore to exclude sensitive files" || echo "No changes to commit"

# 3. git filter-branchで履歴から機密情報を削除
echo "3. Git履歴から機密情報を削除中..."
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch -r scripts/ .env* app/api/ebay/policy/list/route.ts' \
  --prune-empty --tag-name-filter cat -- --all

# 4. リファレンスをクリーンアップ
echo "4. 参照をクリーンアップ中..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "=== クリーンアップ完了 ==="
echo ""
echo "次のコマンドを実行して強制pushしてください："
echo "git push origin main --force"
echo ""
echo "⚠️ 注意: force pushは履歴を書き換えます。"
echo "他の開発者がいる場合は事前に通知してください。"
