#!/bin/bash
# ローカルビルドテストとデプロイ準備

echo "🔨 ローカルビルドテスト開始..."
echo ""

cd ~/n3-frontend_new

# ビルドテスト
echo "1️⃣ npm run build を実行..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ビルド成功！"
    echo ""
    echo "2️⃣ Gitにコミット&プッシュ..."
    git add .
    git commit -m "fix: VPSデプロイ用にnpm rebuildを追加"
    git push origin main
    
    echo ""
    echo "✅ GitHubにプッシュ完了！"
    echo ""
    echo "🚀 次のステップ:"
    echo "   1. ブラウザで http://localhost:3000/tools/git-deploy を開く"
    echo "   2. 「デプロイ」タブを開く"
    echo "   3. 「🧹 完全クリーンデプロイを実行」ボタンをクリック"
    echo ""
else
    echo ""
    echo "❌ ビルド失敗"
    echo ""
    echo "エラーを確認して修正してください"
fi
