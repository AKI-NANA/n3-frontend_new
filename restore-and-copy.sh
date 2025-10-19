#!/bin/bash

echo "=== 元のlayout.tsxを復元してN3-Developmentからコンポーネントをコピー ==="
echo ""

# プロセスを停止
pkill -9 -f "next" 2>/dev/null
sleep 2

cd /Users/aritahiroaki/n3-frontend_new

# layout.tsxを元に戻す
echo "1. layout.tsxを復元中..."
if [ -f "app/layout.backup.tsx" ]; then
  cp app/layout.backup.tsx app/layout.tsx
  echo "   ✓ layout.tsxを復元しました"
else
  echo "   ⚠ バックアップが見つかりません。N3-Developmentからコピーします..."
  cp N3-Development/n3-frontend/app/layout.tsx app/layout.tsx
fi

# コンポーネントをコピー
echo "2. N3-Developmentからコンポーネントをコピー中..."
cp -r N3-Development/n3-frontend/components/* components/

# キャッシュをクリア
echo "3. キャッシュをクリア中..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "=== 復元完了 ==="
echo ""
echo "開発サーバーを起動します..."
npm run dev
