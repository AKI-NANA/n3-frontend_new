#!/bin/bash
# VPSに不要なファイルを _archive に移動するスクリプト

ARCHIVE_DIR="/Users/aritahiroaki/n3-frontend_new/_archive"
PROJECT_DIR="/Users/aritahiroaki/n3-frontend_new"

cd "$PROJECT_DIR" || exit 1

echo "🗂️ アーカイブフォルダを作成..."
mkdir -p "$ARCHIVE_DIR"

echo ""
echo "📦 以下のファイルを _archive に移動します："
echo ""

# 移動するファイル・フォルダのリスト
ITEMS_TO_MOVE=(
    # ドキュメント・ガイド
    "ADD_CLEAN_DEPLOY_INSTRUCTIONS.md"
    "CLEAN_DEPLOY_CARD_INSERT.txt"
    "DEPLOY_CHECKLIST.md"
    "DEPLOY_IMPLEMENTATION_GUIDE.md"
    "GIT_DEPLOY_CLEANUP_STATUS.md"
    "PERMANENT_CLEANUP_STRATEGY.md"
    "VPS_DEPLOY_GUIDE.md"
    "VPS_DEPLOY_WITH_CLEANUP.md"
    
    # スクリプトファイル
    "backup-repo.sh"
    "check-github-files.sh"
    "check-typescript-errors.sh"
    "cleanup-complete.sh"
    "cleanup-git-cache.sh"
    "cleanup-github.sh"
    "final-build-check.sh"
    "fix_page_tsx.py"
    "fresh-install.sh"
    "git-cleanup-permanent.sh"
    "git-cleanup-safe.sh"
    "git-diagnosis.sh"
    "vps-cleanup.sh"
    "vps-deploy-clean.sh"
    "vps-deploy-complete.sh"
    
    # 不要なディレクトリ
    "08_wisdom_core"
    
    # ログファイル
    "typescript_errors_remaining.log"
    
    # VS Code設定
    "n3-frontend_new.code-workspace"
    
    # バックアップファイル
    "app/tools/git-deploy/page.tsx.backup"
)

# 移動実行
for item in "${ITEMS_TO_MOVE[@]}"; do
    if [ -e "$item" ]; then
        echo "  ✓ $item"
        mv "$item" "$ARCHIVE_DIR/"
    else
        echo "  ⊗ $item (存在しない)"
    fi
done

echo ""
echo "✅ 完了！アーカイブされたファイル："
ls -lh "$ARCHIVE_DIR" | tail -n +2 | wc -l
echo ""
echo "📂 アーカイブ場所: $ARCHIVE_DIR"
