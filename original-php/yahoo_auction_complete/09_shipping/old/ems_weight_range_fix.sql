-- EMS 正確な重量範囲修正版
-- 重量範囲の境界を正確に設定

\echo '=== EMS 重量範囲修正開始 ==='

-- 既存のEMSデータを完全削除
DELETE FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS';

-- 正確な重量範囲でEMSデータを投入
INSERT INTO real_shipping_rates (
    carrier_code, 
    service_code, 
    destination_country,
    zone_code,
    weight_from_g, 
    weight_to_g, 
    price_jpy, 
    delivery_days,
    has_tracking,
    has_insurance,
    data_source,
    created_at
) VALUES 
-- 500gまで ¥3,900 (100g-500g)
('JPPOST', 'EMS', 'US', 'zone4', 100, 500, 3900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 600gまで ¥4,180 (501g-600g) 
('JPPOST', 'EMS', 'US', 'zone4', 501, 600, 4180.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 700gまで ¥4,460 (601g-700g)
('JPPOST', 'EMS', 'US', 'zone4', 601, 700, 4460.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 800gまで ¥4,740 (701g-800g)
('JPPOST', 'EMS', 'US', 'zone4', 701, 800, 4740.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 900gまで ¥5,020 (801g-900g)
('JPPOST', 'EMS', 'US', 'zone4', 801, 900, 5020.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 1.0kgまで ¥5,300 (901g-1000g) ← ここが重要
('JPPOST', 'EMS', 'US', 'zone4', 901, 1000, 5300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 1.25kgまで ¥5,990 (1001g-1250g)
('JPPOST', 'EMS', 'US', 'zone4', 1001, 1250, 5990.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 1.5kgまで ¥6,600 (1251g-1500g) ← 1.0kgはここに含まれない
('JPPOST', 'EMS', 'US', 'zone4', 1251, 1500, 6600.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 1.75kgまで ¥7,290 (1501g-1750g)
('JPPOST', 'EMS', 'US', 'zone4', 1501, 1750, 7290.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 2.0kgまで ¥7,900 (1751g-2000g)
('JPPOST', 'EMS', 'US', 'zone4', 1751, 2000, 7900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 2.5kgまで ¥9,100 (2001g-2500g)
('JPPOST', 'EMS', 'US', 'zone4', 2001, 2500, 9100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 3.0kgまで ¥10,300 (2501g-3000g)
('JPPOST', 'EMS', 'US', 'zone4', 2501, 3000, 10300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 3.5kgまで ¥11,500 (3001g-3500g)
('JPPOST', 'EMS', 'US', 'zone4', 3001, 3500, 11500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 4.0kgまで ¥12,700 (3501g-4000g)
('JPPOST', 'EMS', 'US', 'zone4', 3501, 4000, 12700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 4.5kgまで ¥13,900 (4001g-4500g)
('JPPOST', 'EMS', 'US', 'zone4', 4001, 4500, 13900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 5.0kgまで ¥15,100 (4501g-5000g)
('JPPOST', 'EMS', 'US', 'zone4', 4501, 5000, 15100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 5.5kgまで ¥16,300 (5001g-5500g)
('JPPOST', 'EMS', 'US', 'zone4', 5001, 5500, 16300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 6.0kgまで ¥17,500 (5501g-6000g)
('JPPOST', 'EMS', 'US', 'zone4', 5501, 6000, 17500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 7.0kgまで ¥19,900 (6001g-7000g)
('JPPOST', 'EMS', 'US', 'zone4', 6001, 7000, 19900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 8.0kgまで ¥22,300 (7001g-8000g)
('JPPOST', 'EMS', 'US', 'zone4', 7001, 8000, 22300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 9.0kgまで ¥24,700 (8001g-9000g)
('JPPOST', 'EMS', 'US', 'zone4', 8001, 9000, 24700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 10.0kgまで ¥27,100 (9001g-10000g)
('JPPOST', 'EMS', 'US', 'zone4', 9001, 10000, 27100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 11.0kgまで ¥29,500 (10001g-11000g)
('JPPOST', 'EMS', 'US', 'zone4', 10001, 11000, 29500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 12.0kgまで ¥31,900 (11001g-12000g)
('JPPOST', 'EMS', 'US', 'zone4', 11001, 12000, 31900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 13.0kgまで ¥34,300 (12001g-13000g)
('JPPOST', 'EMS', 'US', 'zone4', 12001, 13000, 34300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 14.0kgまで ¥36,700 (13001g-14000g)
('JPPOST', 'EMS', 'US', 'zone4', 13001, 14000, 36700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 15.0kgまで ¥39,100 (14001g-15000g)
('JPPOST', 'EMS', 'US', 'zone4', 14001, 15000, 39100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 16.0kgまで ¥41,500 (15001g-16000g)
('JPPOST', 'EMS', 'US', 'zone4', 15001, 16000, 41500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 17.0kgまで ¥43,900 (16001g-17000g)
('JPPOST', 'EMS', 'US', 'zone4', 16001, 17000, 43900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 18.0kgまで ¥46,300 (17001g-18000g)
('JPPOST', 'EMS', 'US', 'zone4', 17001, 18000, 46300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 19.0kgまで ¥48,700 (18001g-19000g)
('JPPOST', 'EMS', 'US', 'zone4', 18001, 19000, 48700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 20.0kgまで ¥51,100 (19001g-20000g)
('JPPOST', 'EMS', 'US', 'zone4', 19001, 20000, 51100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 21.0kgまで ¥53,500 (20001g-21000g)
('JPPOST', 'EMS', 'US', 'zone4', 20001, 21000, 53500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 22.0kgまで ¥55,900 (21001g-22000g)
('JPPOST', 'EMS', 'US', 'zone4', 21001, 22000, 55900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 23.0kgまで ¥58,300 (22001g-23000g)
('JPPOST', 'EMS', 'US', 'zone4', 22001, 23000, 58300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 24.0kgまで ¥60,700 (23001g-24000g)
('JPPOST', 'EMS', 'US', 'zone4', 23001, 24000, 60700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 25.0kgまで ¥63,100 (24001g-25000g)
('JPPOST', 'EMS', 'US', 'zone4', 24001, 25000, 63100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 26.0kgまで ¥65,500 (25001g-26000g)
('JPPOST', 'EMS', 'US', 'zone4', 25001, 26000, 65500.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 27.0kgまで ¥67,900 (26001g-27000g)
('JPPOST', 'EMS', 'US', 'zone4', 26001, 27000, 67900.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 28.0kgまで ¥70,300 (27001g-28000g)
('JPPOST', 'EMS', 'US', 'zone4', 27001, 28000, 70300.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 29.0kgまで ¥72,700 (28001g-29000g)
('JPPOST', 'EMS', 'US', 'zone4', 28001, 29000, 72700.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW()),
-- 30.0kgまで ¥75,100 (29001g-30000g)
('JPPOST', 'EMS', 'US', 'zone4', 29001, 30000, 75100.00, '3-6営業日', true, true, 'ems_official_2025_fixed', NOW());

-- 重量範囲確認クエリ
\echo '重量範囲確認:'
SELECT 
    weight_from_g,
    weight_to_g,
    price_jpy,
    CASE 
        WHEN 500 BETWEEN weight_from_g AND weight_to_g THEN '✅ 0.5kg対応'
        ELSE '❌ 範囲外'
    END as kg_05_check,
    CASE 
        WHEN 1000 BETWEEN weight_from_g AND weight_to_g THEN '✅ 1.0kg対応'
        ELSE '❌ 範囲外'
    END as kg_10_check
FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND data_source = 'ems_official_2025_fixed'
ORDER BY weight_from_g
LIMIT 10;

-- 投入結果確認
DO $$
DECLARE
    ems_count integer;
    weight_05_price numeric;
    weight_10_price numeric;
BEGIN
    SELECT COUNT(*) INTO ems_count
    FROM real_shipping_rates 
    WHERE carrier_code = 'JPPOST' 
    AND service_code = 'EMS'
    AND data_source = 'ems_official_2025_fixed';

    -- 0.5kg (500g) の料金確認
    SELECT price_jpy INTO weight_05_price
    FROM real_shipping_rates 
    WHERE carrier_code = 'JPPOST' 
    AND service_code = 'EMS'
    AND 500 BETWEEN weight_from_g AND weight_to_g
    LIMIT 1;

    -- 1.0kg (1000g) の料金確認
    SELECT price_jpy INTO weight_10_price
    FROM real_shipping_rates 
    WHERE carrier_code = 'JPPOST' 
    AND service_code = 'EMS'
    AND 1000 BETWEEN weight_from_g AND weight_to_g
    LIMIT 1;

    RAISE NOTICE '✅ EMS 重量範囲修正完了';
    RAISE NOTICE '==========================';
    RAISE NOTICE 'レコード数: % 件', ems_count;
    RAISE NOTICE '0.5kg料金: ¥% (期待値: ¥3,900)', weight_05_price;
    RAISE NOTICE '1.0kg料金: ¥% (期待値: ¥5,300)', weight_10_price;
    RAISE NOTICE '';
    RAISE NOTICE '🔍 修正ポイント:';
    RAISE NOTICE '   重量範囲の境界を正確に設定';
    RAISE NOTICE '   0.5kg: 100g-500g → ¥3,900';
    RAISE NOTICE '   1.0kg: 901g-1000g → ¥5,300';
    RAISE NOTICE '   1.5kg: 1251g-1500g → ¥6,600';
END $$;

\echo '=== EMS 重量範囲修正完了 ==='