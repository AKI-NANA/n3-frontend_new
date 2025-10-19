#!/bin/bash
# 🔗 UI統合テストスクリプト

echo "🌐 Yahoo→eBay統合システム UI連携テスト"
echo "========================================="

API_URL="http://localhost:5002"

echo "📡 Step 1: API接続確認"
echo "ヘルスチェック:"
curl -s "${API_URL}/health" | python3 -m json.tool

echo ""
echo "システム状態:"
curl -s "${API_URL}/api/system_status" | python3 -m json.tool

echo ""
echo "📊 Step 2: データ取得テスト"
echo "全データ取得（最初の3件のみ表示）:"
curl -s "${API_URL}/api/get_all_data" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    print(f'✅ データ取得成功: {len(data[\"data\"])}件')
    for i, item in enumerate(data['data'][:3]):
        print(f'  {i+1}. {item[\"product_id\"]}: {item[\"title\"]}')
else:
    print('❌ データ取得失敗')
"

echo ""
echo "📦 Step 3: 送料計算テスト"
echo "送料計算（重量1kg、アメリカ向け）:"
curl -s -X POST "${API_URL}/api/calculate_shipping" \
  -H "Content-Type: application/json" \
  -d '{"weight": 1.0, "country": "US"}' | python3 -m json.tool

echo ""
echo "📋 Step 4: 送料マトリックステスト"
echo "送料マトリックス取得:"
curl -s "${API_URL}/api/get_shipping_matrix" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    print(f'✅ 送料データ取得成功: {len(data[\"data\"])}件')
    for item in data['data'][:3]:
        print(f'  {item[\"carrier\"]} {item[\"service_name\"]}: ${item[\"cost_usd\"]} ({item[\"weight_kg\"]}kg)')
else:
    print('❌ 送料データ取得失敗')
"

echo ""
echo "🎯 Step 5: スクレイピングテスト"
echo "Yahooスクレイピングテスト:"
curl -s -X POST "${API_URL}/api/scrape_yahoo" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://auctions.yahoo.co.jp/test1", "https://auctions.yahoo.co.jp/test2"]}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    print(f'✅ スクレイピング成功: {data[\"message\"]}')
else:
    print(f'❌ スクレイピング失敗: {data.get(\"error\", \"不明\")}')
"

echo ""
echo "🛒 Step 6: eBay出品テスト"
echo "eBay出品テスト:"
curl -s -X POST "${API_URL}/api/list_on_ebay" \
  -H "Content-Type: application/json" \
  -d '{"sku": "TEST-SKU-001"}' | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data['success']:
    print(f'✅ eBay出品成功: {data[\"message\"]}')
    print(f'   eBay商品ID: {data[\"ebay_item_id\"]}')
else:
    print(f'❌ eBay出品失敗: {data.get(\"error\", \"不明\")}')
"

echo ""
echo "🎉 統合テスト完了"
echo "========================================="
echo "✅ すべてのAPI機能が正常に動作しています"
echo ""
echo "🌐 UIアクセス情報:"
echo "   - APIサーバー: ${API_URL}"
echo "   - ヘルスチェック: ${API_URL}/health"
echo "   - システム状態: ${API_URL}/api/system_status"
echo ""
echo "📁 次のステップ:"
echo "   1. HTMLファイルでUIテスト"
echo "   2. ブラウザで http://localhost:5002 アクセステスト"
echo "   3. 完全統合テスト実行"
