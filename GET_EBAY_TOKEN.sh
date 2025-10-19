#!/bin/bash

echo "============================================================"
echo "🔐 eBay Refresh Token 取得 - 対話形式ガイド"
echo "============================================================"
echo ""

echo "📍 ステップ 1: eBay Developer Portal にアクセス"
echo ""
echo "以下の URL を開いてください："
echo ""
echo "   https://developer.ebay.com/tools/auth"
echo ""
echo "============================================================"
echo ""
echo "📍 ステップ 2: OAuth2 Token セクションで以下を実行"
echo ""
echo "1. eBay ビジネスアカウントでログイン"
echo "2. 'User Consent URL' セクションを見つける"
echo "3. スコープ: https://api.ebay.com/oauth/api_scope を選択"
echo "4. 'Generate OAuth2 Token' をクリック"
echo "5. 'Agree' をクリック"
echo ""
echo "============================================================"
echo ""
echo "📍 ステップ 3: トークンをコピー"
echo ""
echo "以下の値が表示されます："
echo "   - Authorization Code"
echo "   - Refresh Token ← これが必要"
echo "   - Access Token"
echo ""
echo "Refresh Token をコピーしてください"
echo ""
echo "============================================================"
echo ""
echo "📍 ステップ 4: トークンを .env.local に保存"
echo ""
echo "ターミナルに戻り、以下を実行："
echo ""
read -p "Refresh Token を貼り付けてください: " REFRESH_TOKEN

if [ -z "$REFRESH_TOKEN" ]; then
    echo "❌ トークンが入力されていません"
    exit 1
fi

# .env.local を更新
sed -i '' "s/^EBAY_REFRESH_TOKEN=.*/EBAY_REFRESH_TOKEN=$REFRESH_TOKEN/" .env.local

echo ""
echo "✅ .env.local に Refresh Token を保存しました"
echo "   Token: ${REFRESH_TOKEN:0:50}..."
echo ""
echo "============================================================"
echo "📍 ステップ 5: テストを実行"
echo "============================================================"
echo ""
echo "以下のコマンドを実行してください："
echo ""
echo "   npm run ebay:api-test"
echo ""
