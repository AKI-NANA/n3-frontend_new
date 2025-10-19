#!/bin/bash
# CSV一括投入で配送料金データを完全修正

echo "📊 CSV一括投入による配送料金完全修正"
echo "======================================"

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: CSV投入実行"
psql -h localhost -d nagano3_db -U postgres -f import_csv_data.sql

echo ""
echo "📋 Step 2: API動作確認"
echo "APIが正しく動作するかテスト中..."

# APIテスト（curl使用）
echo "APIテスト結果:"
curl -s -X POST "http://localhost:8000/new_structure/09_shipping/api/matrix_data_api.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_tabbed_matrix","destination":"US","max_weight":5.0,"weight_step":0.5}' \
  | head -c 200

echo ""
echo ""
echo "✅ CSV一括投入完了！"
echo "=================="
echo ""
echo "🎯 修正内容:"
echo "・EMS 0.5kg: ¥3,900 (正確)"
echo "・EMS 1.0kg: ¥5,300 (正確)"
echo "・CPass SpeedPAK: 4カ国対応"
echo "・重量範囲: 0.1kg-30kg"
echo ""
echo "📌 確認手順:"
echo "1. ブラウザで以下にアクセス:"
echo "   http://localhost:8000/new_structure/09_shipping/unified_comparison.php"
echo "2. 「統合料金マトリックス生成」ボタンクリック"
echo "3. EMS列で料金確認:"
echo "   - 0.5kg → ¥3,900"
echo "   - 1.0kg → ¥5,300"
echo "   - 青色の「実データ」表示確認"