-- EMS重量マッピング詳細確認
-- 具体的にどの重量がどの範囲にマッチするかを確認

\echo '=== EMS 重量マッピング詳細確認 ==='

-- 主要重量ポイントの料金確認
WITH weight_tests AS (
  SELECT unnest(ARRAY[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 5000, 10000]) as test_weight_g
)
SELECT 
    wt.test_weight_g,
    wt.test_weight_g/1000.0 as test_weight_kg,
    rsr.weight_from_g,
    rsr.weight_to_g,
    rsr.price_jpy,
    CASE 
        WHEN wt.test_weight_g BETWEEN rsr.weight_from_g AND rsr.weight_to_g 
        THEN '✅ マッチ' 
        ELSE '❌ 範囲外' 
    END as match_status
FROM weight_tests wt
LEFT JOIN real_shipping_rates rsr ON (
    rsr.carrier_code = 'JPPOST' 
    AND rsr.service_code = 'EMS'
    AND wt.test_weight_g BETWEEN rsr.weight_from_g AND rsr.weight_to_g
)
ORDER BY wt.test_weight_g;

\echo ''
\echo '=== 重量範囲の重複・空白確認 ==='

-- 重量範囲の連続性確認
SELECT 
    weight_from_g,
    weight_to_g,
    price_jpy,
    LAG(weight_to_g) OVER (ORDER BY weight_from_g) as prev_weight_to,
    CASE 
        WHEN LAG(weight_to_g) OVER (ORDER BY weight_from_g) + 1 = weight_from_g 
        THEN '✅ 連続'
        WHEN LAG(weight_to_g) OVER (ORDER BY weight_from_g) IS NULL 
        THEN '🔸 開始'
        ELSE '❌ 空白あり'
    END as continuity_check
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND data_source = 'ems_official_2025_fixed'
ORDER BY weight_from_g;

\echo ''
\echo '=== API呼び出しシミュレーション ==='

-- APIで使用される重量検索の動作確認
SELECT 
    'API重量検索テスト' as test_type,
    weight_from_g,
    weight_to_g,
    price_jpy,
    ABS(weight_from_g - 500) as distance_from_500g,
    ABS(weight_from_g - 1000) as distance_from_1000g
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND weight_from_g <= 500 AND weight_to_g >= 500
ORDER BY ABS(weight_from_g - 500) ASC;

-- 1.0kg検索テスト
SELECT 
    'API 1.0kg検索' as test_type,
    weight_from_g,
    weight_to_g,
    price_jpy,
    ABS(weight_from_g - 1000) as distance_from_1000g
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND weight_from_g <= 1000 AND weight_to_g >= 1000
ORDER BY ABS(weight_from_g - 1000) ASC;