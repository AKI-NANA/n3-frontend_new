#!/bin/bash
# 🔧 修正されたAPI機能テスト

# ポート番号（サーバーが起動したポートに合わせて変更）
PORT=${1:-5003}
API_URL="http://localhost:${PORT}"

echo "🧪 修正されたAPI機能テスト"
echo "API URL: ${API_URL}"
echo "================================="

echo ""
echo "📊 Step 1: データ取得テスト（修正版）"
echo "全データ取得:"
curl -s "${API_URL}/api/get_all_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data['success']:
        print(f'✅ データ取得成功: {len(data[\"data\"])}件')
        print(f'サンプル: {data[\"data\"][0][\"product_id\"]} - {data[\"data\"][0][\"title\"]}')
        # 数値フィールドの確認
        sample = data['data'][0]
        print(f'価格データ: JPY={sample.get(\"price_jpy\")}, USD={sample.get(\"calculated_price_usd\")}')
    else:
        print('❌ データ取得失敗')
        print(data)
except Exception as e:
    print(f'❌ JSON解析エラー: {e}')
"

echo ""
echo "📋 Step 2: 送料マトリックステスト（修正版）"
echo "送料マトリックス取得:"
curl -s "${API_URL}/api/get_shipping_matrix" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data['success']:
        print(f'✅ 送料マトリックス取得成功: {len(data[\"data\"])}件')
        for item in data['data'][:3]:
            print(f'  {item[\"carrier\"]} {item[\"service_name\"]}: \${item[\"cost_usd\"]} ({item[\"weight_kg\"]}kg)')
    else:
        print('❌ 送料マトリックス取得失敗')
        print(data)
except Exception as e:
    print(f'❌ JSON解析エラー: {e}')
"

echo ""
echo "🎯 Step 3: システム状態確認"
echo "システム状態:"
curl -s "${API_URL}/api/system_status" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data['success']:
        stats = data['stats']
        print(f'✅ システム状態取得成功')
        print(f'  総データ数: {stats[\"total\"]}')
        print(f'  スクレイピング済み: {stats[\"scraped\"]}')
        print(f'  計算済み: {stats[\"calculated\"]}')
        print(f'  出品準備完了: {stats[\"ready\"]}')
    else:
        print('❌ システム状態取得失敗')
except Exception as e:
    print(f'❌ JSON解析エラー: {e}')
"

echo ""
echo "🎉 修正確認テスト完了"
echo "================================="

if [ $? -eq 0 ]; then
    echo "✅ 全ての修正が正常に動作しています！"
    echo ""
    echo "🌐 ブラウザでUIテスト:"
    echo "  file:///Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/yahoo_auction_tool/system_dashboard.html"
    echo ""
    echo "📝 注意: system_dashboard.htmlのAPI URLをポート${PORT}に変更してください"
else
    echo "❌ まだ問題があります。ログを確認してください。"
fi
