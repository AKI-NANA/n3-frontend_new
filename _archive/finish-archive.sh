#!/bin/bash
# 残りのディレクトリを _archive に移動

cd /Users/aritahiroaki/n3-frontend_new

echo "📦 残りのアイテムを移動..."

# 08_wisdom_core ディレクトリを移動
if [ -d "08_wisdom_core" ]; then
    echo "  ✓ 08_wisdom_core"
    mv 08_wisdom_core _archive/
else
    echo "  ⊗ 08_wisdom_core (存在しない)"
fi

# page.tsx.backup を移動
if [ -f "app/tools/git-deploy/page.tsx.backup" ]; then
    echo "  ✓ app/tools/git-deploy/page.tsx.backup"
    mv app/tools/git-deploy/page.tsx.backup _archive/
else
    echo "  ⊗ page.tsx.backup (存在しない)"
fi

echo ""
echo "✅ 完了！"
echo ""
echo "📂 アーカイブ内容:"
ls -lh _archive/
