-- データベース現状確認スクリプト
-- real_shipping_rates テーブルの状況を詳細確認

-- 1. テーブル存在確認
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'real_shipping_rates'
) AS table_exists;

-- 2. 全体データ数確認
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT carrier_code) as carrier_count,
    COUNT(DISTINCT service_code) as service_count
FROM real_shipping_rates;

-- 3. 業者別データ数確認
SELECT 
    carrier_code,
    COUNT(*) as record_count,
    COUNT(DISTINCT service_code) as service_count,
    MIN(weight_from_g) as min_weight,
    MAX(weight_to_g) as max_weight,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price
FROM real_shipping_rates
GROUP BY carrier_code
ORDER BY carrier_code;

-- 4. SpeedPAKサービス詳細確認
SELECT 
    service_code,
    COUNT(*) as record_count,
    MIN(weight_from_g) as min_weight,
    MAX(weight_to_g) as max_weight,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price,
    data_source
FROM real_shipping_rates
WHERE carrier_code = 'SPEEDPAK'
GROUP BY service_code, data_source
ORDER BY service_code;

-- 5. サンプルデータ確認（最初の10件）
SELECT 
    carrier_code,
    service_code,
    weight_from_g,
    weight_to_g,
    price_jpy,
    data_source
FROM real_shipping_rates
WHERE carrier_code = 'SPEEDPAK'
ORDER BY service_code, weight_from_g
LIMIT 10;

-- 6. 重量範囲の詳細確認
SELECT 
    carrier_code,
    service_code,
    COUNT(*) as points,
    array_agg(DISTINCT weight_from_g ORDER BY weight_from_g) as weight_points
FROM real_shipping_rates
WHERE carrier_code = 'SPEEDPAK'
GROUP BY carrier_code, service_code
ORDER BY service_code;

-- 7. 問題のあるデータ確認
SELECT 
    carrier_code,
    service_code,
    COUNT(*) as records_with_issues
FROM real_shipping_rates
WHERE price_jpy IS NULL 
   OR price_jpy <= 0 
   OR weight_from_g IS NULL 
   OR weight_to_g IS NULL
GROUP BY carrier_code, service_code;

-- 8. データソース確認
SELECT 
    data_source,
    COUNT(*) as record_count,
    COUNT(DISTINCT carrier_code) as carrier_count,
    COUNT(DISTINCT service_code) as service_count
FROM real_shipping_rates
GROUP BY data_source
ORDER BY data_source;