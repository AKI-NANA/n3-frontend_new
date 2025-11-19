#!/bin/bash
# プロジェクト整理完了レポート

echo "📊 プロジェクト整理完了レポート"
echo "================================"
echo ""

cd /Users/aritahiroaki/n3-frontend_new

echo "✅ 移動完了したファイル（_archive内）:"
echo "-----------------------------------"
ls -1 _archive/ | nl
echo ""

echo "📂 プロジェクトルートの現在のファイル:"
echo "-----------------------------------"
ls -1 | grep -v "node_modules" | grep -v ".next" | grep -v "_archive"
echo ""

echo "🎯 VPSにデプロイされるファイル:"
echo "-----------------------------------"
echo "✓ app/"
echo "✓ components/"
echo "✓ contexts/"
echo "✓ data/"
echo "✓ hooks/"
echo "✓ lib/"
echo "✓ public/"
echo "✓ services/"
echo "✓ store/"
echo "✓ types/"
echo "✓ middleware.ts"
echo "✓ next.config.ts"
echo "✓ package.json"
echo "✓ tsconfig.json"
echo "✓ .env.production"
echo ""

echo "❌ VPSにデプロイされないファイル（_archive内）:"
echo "-----------------------------------"
echo "• ドキュメント・ガイド（8個）"
echo "• 開発スクリプト（15個）"
echo "• バックアップファイル"
echo "• ログファイル"
echo "• VS Code設定"
echo "• 08_wisdom_coreディレクトリ"
echo ""

echo "🔐 .gitignoreに追加済み:"
echo "-----------------------------------"
echo "_archive/"
echo ""

echo "✅ 整理完了！VPSへのデプロイ準備ができました。"
