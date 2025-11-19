#!/bin/bash

echo "========================================="
echo "🗑️  Git追跡ファイル削除スクリプト"
echo "========================================="
echo ""
echo "⚠️  警告：このスクリプトは以下を実行します："
echo ""
echo "1. Git追跡から以下のファイルを削除："
echo "   - *.bak"
echo "   - *.original"
echo "   - *_old.tsx, *_old.ts"
echo "   - *_backup.*"
echo "   - _archive/ ディレクトリ全体"
echo ""
echo "2. ローカルファイルシステムから削除"
echo "3. GitHubにプッシュ（追跡解除を反映）"
echo ""
echo "💾 バックアップは自動作成されます"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 1
fi

cd /Users/aritahiroaki/n3-frontend_new

echo ""
echo "========================================="
echo "📦 Phase 1: バックアップ作成"
echo "========================================="
echo ""

BACKUP_DIR=~/Desktop/n3-frontend_backup_$(date +%Y%m%d_%H%M%S)
echo "バックアップディレクトリ: ${BACKUP_DIR}"
cp -r /Users/aritahiroaki/n3-frontend_new ${BACKUP_DIR}
echo "✅ バックアップ完了"

echo ""
echo "========================================="
echo "🔍 Phase 2: 削除対象ファイルの確認"
echo "========================================="
echo ""

echo "--- Git追跡中の削除対象ファイル ---"
echo ""

echo "1. .bak ファイル:"
git ls-files | grep "\.bak$" | wc -l

echo "2. .original ファイル:"
git ls-files | grep "\.original$" | wc -l

echo "3. *_old.tsx, *_old.ts ファイル:"
git ls-files | grep "_old\.\(tsx\|ts\)$" | wc -l

echo "4. *_backup.* ファイル:"
git ls-files | grep "_backup\." | wc -l

echo "5. _archive/ ディレクトリ:"
git ls-files | grep "^_archive/" | wc -l

echo ""
TOTAL_FILES=$(git ls-files | grep -E "\.(bak|original)$|_old\.(tsx|ts)$|_backup\.|^_archive/" | wc -l)
echo "削除対象ファイル総数: ${TOTAL_FILES}件"

if [ ${TOTAL_FILES} -eq 0 ]; then
    echo ""
    echo "✅ 削除対象のファイルはありません"
    exit 0
fi

echo ""
echo "🔍 削除対象ファイルの詳細を表示しますか？"
read -p "(y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "========================================="
    echo "📄 削除対象ファイルの詳細リスト"
    echo "========================================="
    echo ""
    echo "--- .bak ファイル ---"
    git ls-files | grep "\.bak$" | head -20
    echo ""
    echo "--- .original ファイル ---"
    git ls-files | grep "\.original$" | head -20
    echo ""
    echo "--- *_old.tsx, *_old.ts ファイル ---"
    git ls-files | grep "_old\.(tsx|ts)$" | head -20
    echo ""
    echo "--- *_backup.* ファイル ---"
    git ls-files | grep "_backup\." | head -20
    echo ""
    echo "--- _archive/ ディレクトリ ---"
    git ls-files | grep "^_archive/" | head -20
    echo ""
fi

echo ""
echo "⚠️  これらのファイルを削除します"
echo "    - Git追跡から削除（GitHubからも削除されます）"
echo "    - ローカルファイルシステムからも削除"
echo "    - バックアップは作成済みです"
echo ""
read -p "本当に削除しますか？ (yes/no): " CONFIRM
echo

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ キャンセルしました（'yes'と入力する必要があります）"
    exit 1
fi

echo ""
echo "========================================="
echo "🗑️  Phase 3: Gitから削除（追跡解除）"
echo "========================================="
echo ""

# 1. .bak ファイルを削除
echo "1. .bak ファイルを削除中..."
git ls-files | grep "\.bak$" | xargs -r git rm --cached
find . -name "*.bak" -type f -delete
echo "   ✅ 完了"

# 2. .original ファイルを削除
echo "2. .original ファイルを削除中..."
git ls-files | grep "\.original$" | xargs -r git rm --cached
find . -name "*.original" -type f -delete
echo "   ✅ 完了"

# 3. *_old.tsx, *_old.ts ファイルを削除
echo "3. *_old.tsx, *_old.ts ファイルを削除中..."
git ls-files | grep "_old\.tsx$" | xargs -r git rm --cached
git ls-files | grep "_old\.ts$" | xargs -r git rm --cached
find . -name "*_old.tsx" -type f -delete
find . -name "*_old.ts" -type f -delete
echo "   ✅ 完了"

# 4. *_backup.* ファイルを削除
echo "4. *_backup.* ファイルを削除中..."
git ls-files | grep "_backup\." | xargs -r git rm --cached
find . -name "*_backup.*" -type f -delete
echo "   ✅ 完了"

# 5. _archive ディレクトリを削除
echo "5. _archive/ ディレクトリを削除中..."
if [ -d "_archive" ]; then
    git rm -r --cached _archive 2>/dev/null || echo "   (Git追跡なし)"
    rm -rf _archive
    echo "   ✅ 完了"
else
    echo "   ⏭️  スキップ（存在しません）"
fi

echo ""
echo "========================================="
echo "📝 Phase 4: .gitignore の確認"
echo "========================================="
echo ""

echo "現在の .gitignore に以下のパターンが含まれているか確認..."
echo ""

PATTERNS=(
    "*.bak"
    "*.original"
    "*_old.tsx"
    "*_old.ts"
    "*_backup.*"
    "_archive/"
)

MISSING_PATTERNS=()

for pattern in "${PATTERNS[@]}"; do
    if grep -q "^${pattern}$" .gitignore; then
        echo "✅ ${pattern}"
    else
        echo "❌ ${pattern} - 追加が必要"
        MISSING_PATTERNS+=("${pattern}")
    fi
done

if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  不足しているパターンを .gitignore に追加します..."
    echo ""
    echo "# 自動追加: 不要ファイルパターン" >> .gitignore
    for pattern in "${MISSING_PATTERNS[@]}"; do
        echo "${pattern}" >> .gitignore
        echo "   追加: ${pattern}"
    done
    git add .gitignore
    echo "   ✅ .gitignore 更新完了"
fi

echo ""
echo "========================================="
echo "💾 Phase 5: 変更をコミット"
echo "========================================="
echo ""

git status

echo ""
echo "コミットメッセージを入力してください:"
read -p "> " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="chore: 不要ファイル（*.bak, *.original, *_old.*, _archive/）をGit追跡から削除"
fi

git commit -m "${COMMIT_MSG}"

echo ""
echo "✅ コミット完了"

echo ""
echo "========================================="
echo "🚀 Phase 6: GitHubにプッシュ"
echo "========================================="
echo ""

echo "GitHubにプッシュしますか？"
echo "（これにより、不要ファイルがGitHub上からも削除されます）"
echo ""
read -p "(y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ プッシュ完了"
    else
        echo ""
        echo "❌ プッシュ失敗"
        echo "手動でプッシュしてください: git push origin main"
    fi
else
    echo ""
    echo "⏭️  プッシュをスキップしました"
    echo "後でプッシュする場合: git push origin main"
fi

echo ""
echo "========================================="
echo "🔍 Phase 7: 結果確認"
echo "========================================="
echo ""

echo "--- Git追跡ファイル総数 ---"
echo "削除前: 情報なし"
echo "削除後: $(git ls-files | wc -l)件"

echo ""
echo "--- 削除対象ファイルの残存確認 ---"
REMAINING=$(git ls-files | grep -E "\.(bak|original)$|_old\.(tsx|ts)$|_backup\.|^_archive/" | wc -l)
if [ ${REMAINING} -eq 0 ]; then
    echo "✅ 削除対象ファイルは全て削除されました"
else
    echo "⚠️  ${REMAINING}件のファイルが残っています"
    git ls-files | grep -E "\.(bak|original)$|_old\.(tsx|ts)$|_backup\.|^_archive/" | head -10
fi

echo ""
echo "========================================="
echo "✅ 処理完了"
echo "========================================="
echo ""
echo "📋 実行内容:"
echo "  - Git追跡から削除: ${TOTAL_FILES}件"
echo "  - ローカルファイルシステムから削除"
echo "  - .gitignore 更新"
echo "  - コミット作成"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  - GitHubにプッシュ済み"
else
    echo "  - GitHubプッシュ: 未実行"
fi

echo ""
echo "💾 バックアップ: ${BACKUP_DIR}"
echo ""
echo "🚀 次のステップ:"
echo "  1. GitHubでリポジトリを確認"
echo "  2. VPSにデプロイ"
echo "     ssh ubuntu@n3.emverze.com"
echo "     cd ~/n3-frontend_new"
echo "     git pull origin main"
echo ""
