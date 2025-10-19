-- データベース実状確認SQL
-- ファイル: check_database_reality.sql

\echo '=== データベース実状確認開始 ==='

-- 1. テーブル存在確認
SELECT 'shipping_service_ratesテーブル存在確認:' as check_step;
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'shipping_service_rates';

-- 2. テーブル構造確認
SELECT 'テーブル構造確認:' as check_step;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shipping_service_rates'
ORDER BY ordinal_position;

-- 3. 全データ件数確認
SELECT '全データ件数:' as check_step;
SELECT COUNT(*) as total_records FROM shipping_service_rates;

-- 4. EMS関連データ確認
SELECT 'EMS関連データ確認:' as check_step;
SELECT 
    company_code,
    service_code,
    COUNT(*) as record_count
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' OR service_code = 'EMS'
GROUP BY company_code, service_code;

-- 5. アメリカ向けデータ詳細確認
SELECT 'アメリカ向けEMSデータ詳細:' as check_step;
SELECT 
    company_code,
    carrier_code,
    service_code,
    country_code,
    zone_code,
    weight_from_g,
    weight_to_g,
    price_jpy,
    data_source,
    created_at
FROM shipping_service_rates 
WHERE country_code = 'US' 
ORDER BY weight_from_g;

-- 6. 全てのEMSデータ確認
SELECT '全EMSデータ確認:' as check_step;
SELECT 
    country_code,
    zone_code,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price,
    data_source
FROM shipping_service_rates 
WHERE service_code = 'EMS'
ORDER BY country_code, weight_from_g;

-- 7. 料金レンジ確認
SELECT '料金レンジ確認:' as check_step;
SELECT 
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price,
    AVG(price_jpy) as avg_price,
    COUNT(*) as total_records
FROM shipping_service_rates 
WHERE service_code = 'EMS';

-- 8. データソース別確認
SELECT 'データソース別確認:' as check_step;
SELECT 
    data_source,
    COUNT(*) as record_count,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price
FROM shipping_service_rates 
GROUP BY data_source;

-- 9. 重複データ確認
SELECT '重複データ確認:' as check_step;
SELECT 
    company_code,
    service_code,
    country_code,
    weight_from_g,
    weight_to_g,
    COUNT(*) as duplicate_count
FROM shipping_service_rates 
GROUP BY company_code, service_code, country_code, weight_from_g, weight_to_g
HAVING COUNT(*) > 1;

-- 10. 最新データ確認
SELECT '最新投入データ確認:' as check_step;
SELECT 
    company_code,
    service_code,
    country_code,
    price_jpy,
    data_source,
    created_at
FROM shipping_service_rates 
ORDER BY created_at DESC 
LIMIT 10;

SELECT '=== データベース実状確認完了 ===' as final_result;