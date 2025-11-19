#!/bin/bash

echo "========================================="
echo "🔄 クリーンなリポジトリで入れ直し"
echo "========================================="
echo ""

echo "⚠️ この操作は以下を実行します:"
echo ""
echo "1. 現在のリポジトリを削除"
echo "2. GitHubから最新をクローン"
echo "3. 不要ファイルを除外した状態でプッシュ"
echo "4. Mac、GitHub、VPSすべてクリーンな状態に"
echo ""
echo "💾 重要: 必ず backup-repo.sh を先に実行してください！"
echo ""

# バックアップの存在確認
BACKUP_COUNT=$(ls -d ~/n3-frontend_new_backup_* 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -eq 0 ]; then
    echo "❌ バックアップが見つかりません"
    echo ""
    echo "先に backup-repo.sh を実行してください:"
    echo "  cd ~/n3-frontend_new"
    echo "  chmod +x backup-repo.sh"
    echo "  ./backup-repo.sh"
    exit 1
fi

echo "✅ バックアップが見つかりました: ${BACKUP_COUNT}個"
ls -dt ~/n3-frontend_new_backup_* 2>/dev/null | head -3
echo ""

read -p "本当に実行しますか？ 'yes' と入力してください: " CONFIRM
echo

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ キャンセルしました"
    exit 1
fi

echo ""
echo "========================================="
echo "🚀 クリーンな入れ直しを開始"
echo "========================================="
echo ""

# Step 1: 現在のディレクトリを一時的に退避
echo "📦 Step 1: 現在のディレクトリを一時退避中..."
TEMP_DIR="$HOME/n3-frontend_new_temp_$(date +%Y%m%d_%H%M%S)"
mv ~/n3-frontend_new "$TEMP_DIR"
echo "✅ 退避完了: $TEMP_DIR"
echo ""

# Step 2: GitHubから最新をクローン
echo "📥 Step 2: GitHubから最新をクローン中..."
cd ~
git clone https://github.com/AKI-NANA/n3-frontend_new.git

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ クローン失敗"
    echo "元に戻します..."
    mv "$TEMP_DIR" ~/n3-frontend_new
    exit 1
fi
echo "✅ クローン完了"
echo ""

# Step 3: 不要ファイルをローカルで削除
echo "🗑️ Step 3: 不要ファイルを削除中..."
cd ~/n3-frontend_new

# .bak ファイル
find . -name "*.bak" -type f -delete
echo "  ✅ *.bak 削除"

# .original ファイル
find . -name "*.original" -type f -delete
echo "  ✅ *.original 削除"

# *_old.tsx, *_old.ts
find . -name "*_old.tsx" -type f -delete
find . -name "*_old.ts" -type f -delete
echo "  ✅ *_old.tsx, *_old.ts 削除"

# *_backup.*
find . -name "*_backup.*" -type f -delete
echo "  ✅ *_backup.* 削除"

# _archive ディレクトリ
if [ -d "_archive" ]; then
    rm -rf _archive
    echo "  ✅ _archive/ 削除"
fi

echo ""

# Step 4: .gitignoreを更新
echo "📝 Step 4: .gitignore を更新中..."
if ! grep -q "^\*\.bak$" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# 不要ファイルパターン（自動追加）" >> .gitignore
    echo "*.bak" >> .gitignore
    echo "*.original" >> .gitignore
    echo "*_old.tsx" >> .gitignore
    echo "*_old.ts" >> .gitignore
    echo "*_backup.*" >> .gitignore
    echo "_archive/" >> .gitignore
    echo "✅ .gitignore 更新完了"
else
    echo "✅ .gitignore は既に更新済み"
fi
echo ""

# Step 5: 変更をGitにコミット
echo "💾 Step 5: 変更をコミット中..."
git add -A
git commit -m "chore: 不要ファイルを完全削除してクリーン化"
echo "✅ コミット完了"
echo ""

# Step 6: GitHubにプッシュ（強制）
echo "🚀 Step 6: GitHubにプッシュ中..."
echo ""
echo "⚠️ これにより、GitHub上も完全にクリーンになります"
echo ""
read -p "プッシュしますか？ (y/n): " -n 1 -r
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
    echo "⏭️ プッシュをスキップしました"
    echo "後でプッシュする場合: cd ~/n3-frontend_new && git push origin main"
fi

echo ""
echo "========================================="
echo "🎉 完了！"
echo "========================================="
echo ""
echo "📊 リポジトリサイズ比較:"
echo "  古い: $(du -sh "$TEMP_DIR" | cut -f1)"
echo "  新しい: $(du -sh ~/n3-frontend_new | cut -f1)"
echo ""
echo "📂 保存場所:"
echo "  バックアップ: $(ls -dt ~/n3-frontend_new_backup_* 2>/dev/null | head -1)"
echo "  古いリポジトリ: $TEMP_DIR"
echo "  新しいリポジトリ: ~/n3-frontend_new"
echo ""
echo "📝 次のステップ:"
echo "1. 動作確認: cd ~/n3-frontend_new && npm install && npm run dev"
echo "2. VPSを更新:"
echo "   ssh ubuntu@n3.emverze.com"
echo "   cd ~ && rm -rf n3-frontend_new"
echo "   git clone https://github.com/AKI-NANA/n3-frontend_new.git"
echo "   cd n3-frontend_new && npm install && npm run build"
echo "   pm2 restart n3-frontend"
echo ""
echo "💡 古いファイルの削除（後で）:"
echo "  rm -rf $TEMP_DIR"
echo ""
