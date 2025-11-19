#!/bin/bash

echo "========================================="
echo "🚀 最終ビルド確認 & デプロイ準備"
echo "========================================="
echo ""

cd /Users/aritahiroaki/n3-frontend_new

echo "📦 Step 1: 依存関係の確認..."
if [ ! -d "node_modules" ]; then
    echo "node_modules が見つかりません。npm install を実行します..."
    npm install
else
    echo "✅ node_modules 存在確認完了"
fi

echo ""
echo "🔨 Step 2: 本番ビルドを実行..."
echo ""

npm run build

BUILD_EXIT_CODE=$?

echo ""
echo "========================================="

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ ビルド成功！"
    echo "========================================="
    echo ""
    echo "🎉 デプロイ準備が完了しました！"
    echo ""
    echo "📊 ビルド結果:"
    echo "  - Next.js 16.0.3 (Turbopack)"
    echo "  - 本番最適化完了"
    echo "  - 静的ページ生成完了"
    echo ""
    echo "🚀 次のステップ:"
    echo "  1. VPSにSSH接続"
    echo "     ssh ubuntu@n3.emverze.com"
    echo ""
    echo "  2. プロジェクトディレクトリに移動"
    echo "     cd ~/n3-frontend_new"
    echo ""
    echo "  3. 最新コードを取得"
    echo "     git pull origin main"
    echo ""
    echo "  4. 依存関係をインストール"
    echo "     npm install"
    echo ""
    echo "  5. 本番ビルド"
    echo "     npm run build"
    echo ""
    echo "  6. PM2でアプリを再起動"
    echo "     pm2 restart n3-frontend"
    echo ""
    echo "  7. デプロイ確認"
    echo "     https://n3.emverze.com でアクセス"
    echo ""
else
    echo "❌ ビルド失敗（終了コード: ${BUILD_EXIT_CODE}）"
    echo "========================================="
    echo ""
    echo "⚠️  エラーログを確認してください"
    echo ""
    echo "🔍 トラブルシューティング:"
    echo "  1. エラーメッセージを確認"
    echo "  2. node_modules を削除して再インストール"
    echo "     rm -rf node_modules .next"
    echo "     npm install"
    echo "  3. 再度ビルドを実行"
    echo "     npm run build"
    echo ""
fi

echo "========================================="
