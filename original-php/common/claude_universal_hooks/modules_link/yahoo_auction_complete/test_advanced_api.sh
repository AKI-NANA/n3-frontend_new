#!/bin/bash

echo "🧪 高度統合利益計算API テスト実行"

# ベースURL設定
BASE_URL="http://localhost:8081/new_structure/09_shipping"

echo "📡 APIテスト開始..."
echo ""

# 1. ヘルスチェック（修正版）
echo "1️⃣ ヘルスチェック（修正版）:"
curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=health" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=health"
echo ""
echo ""

# 2. eBayテスト計算
echo "2️⃣ eBay USA テスト計算:"
curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=test_ebay" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=test_ebay"
echo ""
echo ""

# 3. Shopeeテスト計算
echo "3️⃣ Shopee シンガポール テスト計算:"
curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=test_shopee" | jq '.' 2>/dev/null || curl -s "${BASE_URL}/advanced_tariff_api_fixed.php?action=test_shopee"
echo ""
echo ""

# 4. 既存API（参考）
echo "4️⃣ 既存API ヘルスチェック（参考）:"
curl -s "${BASE_URL}/advanced_tariff_api.php?action=health" | jq '.success' 2>/dev/null || echo "既存APIはデータベースエラー"
echo ""

echo "✅ APIテスト完了"
echo ""
echo "🌐 ブラウザでアクセス:"
echo "   修正版API: ${BASE_URL}/advanced_tariff_api_fixed.php?action=health"
echo "   eBayテスト: ${BASE_URL}/advanced_tariff_api_fixed.php?action=test_ebay"
echo "   Shopeeテスト: ${BASE_URL}/advanced_tariff_api_fixed.php?action=test_shopee"
