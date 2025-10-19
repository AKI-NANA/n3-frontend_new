-- EMS アメリカ向け正確料金データ更新
-- 日本郵便公式データに基づく正確な料金表

\echo '=== EMS アメリカ向け料金データ更新開始 ==='

-- 既存のEMSデータを削除（アメリカ向け）
DELETE FROM real_shipping_rates 
WHERE carrier_code = 'JPPOST' 
AND service_code = 'EMS'
AND destination_country = 'US';

-- 正確なEMSアメリカ向けデータを投入
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
-- 500gまで ¥3,900
('JPPOST', 'EMS', 'US', 'zone4', 100, 500, 3900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 600gまで ¥4,180
('JPPOST', 'EMS', 'US', 'zone4', 501, 600, 4180.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 700gまで ¥4,460
('JPPOST', 'EMS', 'US', 'zone4', 601, 700, 4460.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 800gまで ¥4,740
('JPPOST', 'EMS', 'US', 'zone4', 701, 800, 4740.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 900gまで ¥5,020
('JPPOST', 'EMS', 'US', 'zone4', 801, 900, 5020.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 1.0kgまで ¥5,300
('JPPOST', 'EMS', 'US', 'zone4', 901, 1000, 5300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 1.25kgまで ¥5,990
('JPPOST', 'EMS', 'US', 'zone4', 1001, 1250, 5990.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 1.5kgまで ¥6,600
('JPPOST', 'EMS', 'US', 'zone4', 1251, 1500, 6600.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 1.75kgまで ¥7,290
('JPPOST', 'EMS', 'US', 'zone4', 1501, 1750, 7290.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 2.0kgまで ¥7,900
('JPPOST', 'EMS', 'US', 'zone4', 1751, 2000, 7900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 2.5kgまで ¥9,100
('JPPOST', 'EMS', 'US', 'zone4', 2001, 2500, 9100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 3.0kgまで ¥10,300
('JPPOST', 'EMS', 'US', 'zone4', 2501, 3000, 10300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 3.5kgまで ¥11,500
('JPPOST', 'EMS', 'US', 'zone4', 3001, 3500, 11500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 4.0kgまで ¥12,700
('JPPOST', 'EMS', 'US', 'zone4', 3501, 4000, 12700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 4.5kgまで ¥13,900
('JPPOST', 'EMS', 'US', 'zone4', 4001, 4500, 13900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 5.0kgまで ¥15,100
('JPPOST', 'EMS', 'US', 'zone4', 4501, 5000, 15100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 5.5kgまで ¥16,300
('JPPOST', 'EMS', 'US', 'zone4', 5001, 5500, 16300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 6.0kgまで ¥17,500
('JPPOST', 'EMS', 'US', 'zone4', 5501, 6000, 17500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 7.0kgまで ¥19,900
('JPPOST', 'EMS', 'US', 'zone4', 6001, 7000, 19900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 8.0kgまで ¥22,300
('JPPOST', 'EMS', 'US', 'zone4', 7001, 8000, 22300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 9.0kgまで ¥24,700
('JPPOST', 'EMS', 'US', 'zone4', 8001, 9000, 24700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 10.0kgまで ¥27,100
('JPPOST', 'EMS', 'US', 'zone4', 9001, 10000, 27100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 11.0kgまで ¥29,500
('JPPOST', 'EMS', 'US', 'zone4', 10001, 11000, 29500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 12.0kgまで ¥31,900
('JPPOST', 'EMS', 'US', 'zone4', 11001, 12000, 31900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 13.0kgまで ¥34,300
('JPPOST', 'EMS', 'US', 'zone4', 12001, 13000, 34300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 14.0kgまで ¥36,700
('JPPOST', 'EMS', 'US', 'zone4', 13001, 14000, 36700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 15.0kgまで ¥39,100
('JPPOST', 'EMS', 'US', 'zone4', 14001, 15000, 39100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 16.0kgまで ¥41,500
('JPPOST', 'EMS', 'US', 'zone4', 15001, 16000, 41500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 17.0kgまで ¥43,900
('JPPOST', 'EMS', 'US', 'zone4', 16001, 17000, 43900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 18.0kgまで ¥46,300
('JPPOST', 'EMS', 'US', 'zone4', 17001, 18000, 46300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 19.0kgまで ¥48,700
('JPPOST', 'EMS', 'US', 'zone4', 18001, 19000, 48700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 20.0kgまで ¥51,100
('JPPOST', 'EMS', 'US', 'zone4', 19001, 20000, 51100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 21.0kgまで ¥53,500
('JPPOST', 'EMS', 'US', 'zone4', 20001, 21000, 53500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 22.0kgまで ¥55,900
('JPPOST', 'EMS', 'US', 'zone4', 21001, 22000, 55900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 23.0kgまで ¥58,300
('JPPOST', 'EMS', 'US', 'zone4', 22001, 23000, 58300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 24.0kgまで ¥60,700
('JPPOST', 'EMS', 'US', 'zone4', 23001, 24000, 60700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 25.0kgまで ¥63,100
('JPPOST', 'EMS', 'US', 'zone4', 24001, 25000, 63100.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 26.0kgまで ¥65,500
('JPPOST', 'EMS', 'US', 'zone4', 25001, 26000, 65500.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 27.0kgまで ¥67,900
('JPPOST', 'EMS', 'US', 'zone4', 26001, 27000, 67900.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 28.0kgまで ¥70,300
('JPPOST', 'EMS', 'US', 'zone4', 27001, 28000, 70300.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 29.0kgまで ¥72,700
('JPPOST', 'EMS', 'US', 'zone4', 28001, 29000, 72700.00, '3-6営業日', true, true, 'ems_official_2025', NOW()),
-- 30.0kgまで ¥75,100
('JPPOST', 'EMS', 'US', 'zone4', 29001, 30000, 75100.00, '3-6営業日', true, true, 'ems_official_2025', NOW());

-- 投入結果確認
DO $$
DECLARE
    ems_count integer;
    min_price numeric;
    max_price numeric;
    max_weight_kg numeric;
BEGIN
    SELECT 
        COUNT(*),
        MIN(price_jpy),
        MAX(price_jpy),
        MAX(weight_to_g)/1000.0
    INTO ems_count, min_price, max_price, max_weight_kg
    FROM real_shipping_rates 
    WHERE carrier_code = 'JPPOST' 
    AND service_code = 'EMS'
    AND data_source = 'ems_official_2025';

    RAISE NOTICE '✅ EMS アメリカ向け正確データ投入完了';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'レコード数: % 件', ems_count;
    RAISE NOTICE '料金範囲: ¥% - ¥%', min_price, max_price;  
    RAISE NOTICE '重量範囲: 0.1kg - %kg', max_weight_kg;
    RAISE NOTICE '';
    RAISE NOTICE '📋 EMS アメリカ向け特徴:';
    RAISE NOTICE '   🇺🇸 対象: アメリカ合衆国全域（第4地帯）';
    RAISE NOTICE '   📦 重量制限: 30kgまで';
    RAISE NOTICE '   🚚 配送日数: 3-6営業日';
    RAISE NOTICE '   📍 追跡: あり';
    RAISE NOTICE '   🛡️ 保険: あり';
    RAISE NOTICE '   💰 特別追加料金込み';
    RAISE NOTICE '';
    RAISE NOTICE 'データソース: 日本郵便公式料金表 2025年版';
END $$;

\echo '=== EMS データ更新完了 ==='