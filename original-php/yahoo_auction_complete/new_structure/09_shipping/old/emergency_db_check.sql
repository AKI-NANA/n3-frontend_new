-- 緊急データベース診断スクリプト
-- データベースの現状と問題を特定

\echo '=== データベース緊急診断 ==='

-- 1. real_shipping_rates テーブル存在確認
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'real_shipping_rates') 
        THEN 'real_shipping_rates テーブルが存在します' 
        ELSE '❌ real_shipping_rates テーブルが存在しません' 
    END as table_status;

-- 2. データ件数確認
SELECT 
    COALESCE(COUNT(*), 0) as total_records,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ データが存在します'
        ELSE '❌ データが1件もありません'
    END as data_status
FROM real_shipping_rates;

-- 3. 業者別データ確認
SELECT 
    carrier_code,
    COUNT(*) as record_count,
    MIN(weight_from_g) as min_weight,
    MAX(weight_to_g) as max_weight
FROM real_shipping_rates
GROUP BY carrier_code
ORDER BY carrier_code;

-- 4. CPassデータ具体的確認
SELECT 
    service_code,
    COUNT(*) as record_count,
    array_agg(DISTINCT weight_from_g ORDER BY weight_from_g) as weights
FROM real_shipping_rates 
WHERE carrier_code = 'CPASS'
GROUP BY service_code
ORDER BY service_code;

-- 5. サンプルデータ表示
SELECT 
    carrier_code,
    service_code,
    weight_from_g,
    price_jpy,
    delivery_days
FROM real_shipping_rates 
WHERE carrier_code = 'CPASS'
ORDER BY service_code, weight_from_g
LIMIT 10;

\echo '=== 診断完了 ==='