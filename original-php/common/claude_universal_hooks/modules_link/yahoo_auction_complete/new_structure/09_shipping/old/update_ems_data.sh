#!/bin/bash
# EMS アメリカ向け正確データ投入スクリプト
# 使用方法: ./update_ems_data.sh

echo "🚀 EMS アメリカ向け正確データ更新開始"
echo "================================="

# ディレクトリ移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: テーブル構造確認・修正"
psql -h localhost -d nagano3_db -U postgres -f fix_table_structure.sql

echo ""
echo "📋 Step 2: EMS正確データ投入"
psql -h localhost -d nagano3_db -U postgres -f ems_usa_official_data.sql

echo ""
echo "📋 Step 3: データ確認"
psql -h localhost -d nagano3_db -U postgres -c "
SELECT 
    carrier_code,
    service_code,
    COUNT(*) as record_count,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price,
    MAX(weight_to_g)/1000.0 as max_weight_kg,
    data_source
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST'
GROUP BY carrier_code, service_code, data_source
ORDER BY data_source;
"

echo ""
echo "✅ EMS データ更新完了！"
echo "========================="
echo ""
echo "📌 次の手順:"
echo "1. ブラウザでページをリロード"
echo "2. 「統合料金マトリックス生成」ボタンをクリック"
echo "3. EMS料金が正確に表示されることを確認"
echo ""
echo "💰 EMS料金確認ポイント:"
echo "・0.5kg: ¥3,900"
echo "・1.0kg: ¥5,300" 
echo "・5.0kg: ¥15,100"
echo "・10.0kg: ¥27,100"
echo "・30.0kg: ¥75,100"