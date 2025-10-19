-- CSV一括投入で配送料金データを完全更新
-- 正確なEMS + CPass SpeedPAKデータ

\echo '=== CSV一括投入による配送料金完全更新 ==='

-- 既存データを完全削除（CSV投入用）
DELETE FROM real_shipping_rates 
WHERE data_source LIKE '%csv%' 
   OR carrier_code IN ('JPPOST', 'CPASS');

-- CSVファイルからデータ投入
\echo 'CSVデータ投入開始...'

\copy real_shipping_rates(carrier_code,service_code,destination_country,zone_code,weight_from_g,weight_to_g,price_jpy,delivery_days,has_tracking,has_insurance,data_source) FROM 'shipping_rates_complete.csv' WITH (FORMAT csv, HEADER true);

-- 投入結果確認
\echo ''
\echo '投入結果確認:'

SELECT 
    carrier_code,
    service_code,
    COUNT(*) as record_count,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price,
    MIN(weight_from_g)/1000.0 as min_weight_kg,
    MAX(weight_to_g)/1000.0 as max_weight_kg,
    data_source
FROM real_shipping_rates 
WHERE data_source LIKE '%csv_2025'
GROUP BY carrier_code, service_code, data_source
ORDER BY carrier_code, service_code;

\echo ''
\echo '重要な料金ポイント確認:'

-- EMS重要料金確認
SELECT 
    'EMS 0.5kg' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy,
    CASE WHEN price_jpy = 3900 THEN '✅ 正確' ELSE '❌ 間違い' END as status
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND 500 BETWEEN weight_from_g AND weight_to_g
AND data_source LIKE '%csv_2025'

UNION ALL

SELECT 
    'EMS 1.0kg' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy,
    CASE WHEN price_jpy = 5300 THEN '✅ 正確' ELSE '❌ 間違い' END as status
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND 1000 BETWEEN weight_from_g AND weight_to_g
AND data_source LIKE '%csv_2025'

UNION ALL

SELECT 
    'SpeedPAK US 0.5kg' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy,
    CASE WHEN price_jpy = 2060 THEN '✅ 正確' ELSE '❌ 間違い' END as status
FROM real_shipping_rates 
WHERE carrier_code = 'CPASS' 
AND service_code = 'SPEEDPAK_ECONOMY_US'
AND 500 BETWEEN weight_from_g AND weight_to_g
AND data_source LIKE '%csv_2025'

UNION ALL

SELECT 
    'SpeedPAK US 1.0kg' as check_point,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy,
    CASE WHEN price_jpy = 3020 THEN '✅ 正確' ELSE '❌ 間違い' END as status
FROM real_shipping_rates 
WHERE carrier_code = 'CPASS' 
AND service_code = 'SPEEDPAK_ECONOMY_US'
AND 1000 BETWEEN weight_from_g AND weight_to_g
AND data_source LIKE '%csv_2025';

-- 最終サマリー
DO $$
DECLARE
    total_records integer;
    ems_records integer;
    cpass_records integer;
BEGIN
    SELECT COUNT(*) INTO total_records 
    FROM real_shipping_rates 
    WHERE data_source LIKE '%csv_2025';
    
    SELECT COUNT(*) INTO ems_records 
    FROM real_shipping_rates 
    WHERE carrier_code = 'JPPOST' 
    AND data_source LIKE '%csv_2025';
    
    SELECT COUNT(*) INTO cpass_records 
    FROM real_shipping_rates 
    WHERE carrier_code = 'CPASS' 
    AND data_source LIKE '%csv_2025';

    RAISE NOTICE '';
    RAISE NOTICE '✅ CSV一括投入完了';
    RAISE NOTICE '=================';
    RAISE NOTICE '総レコード数: % 件', total_records;
    RAISE NOTICE 'EMS: % 件', ems_records;
    RAISE NOTICE 'CPass SpeedPAK: % 件', cpass_records;
    RAISE NOTICE '';
    RAISE NOTICE '📋 期待される表示:';
    RAISE NOTICE '   EMS 0.5kg: ¥3,900';
    RAISE NOTICE '   EMS 1.0kg: ¥5,300';
    RAISE NOTICE '   SpeedPAK US 0.5kg: ¥2,060';
    RAISE NOTICE '   SpeedPAK US 1.0kg: ¥3,020';
    RAISE NOTICE '';
    RAISE NOTICE '📌 次の手順:';
    RAISE NOTICE '   1. ブラウザリロード';
    RAISE NOTICE '   2. マトリックス生成ボタンクリック';
    RAISE NOTICE '   3. 料金表示確認';
END $$;

\echo '=== CSV一括投入完了 ==='