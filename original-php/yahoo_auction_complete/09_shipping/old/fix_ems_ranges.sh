#!/bin/bash
# EMS重量範囲修正スクリプト
# 0.5kg→¥3,900, 1.0kg→¥5,300 が正しく表示されるように修正

echo "🔧 EMS重量範囲修正開始"
echo "===================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/

echo "📋 Step 1: 重量範囲修正実行"
psql -h localhost -d nagano3_db -U postgres -f ems_weight_range_fix.sql

echo ""
echo "📋 Step 2: 重量マッピング詳細確認" 
psql -h localhost -d nagano3_db -U postgres -f debug_ems_weights.sql

echo ""
echo "📋 Step 3: 最終確認"
psql -h localhost -d nagano3_db -U postgres -c "
-- 重要な重量ポイントの最終確認
SELECT 
    '0.5kg (500g) 料金確認' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy as price,
    CASE 
        WHEN price_jpy = 3900 THEN '✅ 正確'
        ELSE '❌ 間違い'
    END as accuracy_check
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND 500 BETWEEN weight_from_g AND weight_to_g

UNION ALL

SELECT 
    '1.0kg (1000g) 料金確認' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy as price,
    CASE 
        WHEN price_jpy = 5300 THEN '✅ 正確'
        ELSE '❌ 間違い'
    END as accuracy_check
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND 1000 BETWEEN weight_from_g AND weight_to_g;
"

echo ""
echo "✅ EMS重量範囲修正完了！"
echo "======================"
echo ""
echo "🎯 期待される修正結果:"
echo "・0.5kg: ¥3,900 (対応外 → 正常表示)"
echo "・1.0kg: ¥5,300 (¥6,600 → 正常表示)"
echo ""
echo "📌 確認手順:"
echo "1. ブラウザリロード"
echo "2. マトリックス生成"
echo "3. EMS列の料金確認"