-- EMS実データ投入SQL
-- ファイル: ems_real_data_import.sql

\echo '=== EMS実データ投入開始 ==='

-- 既存のEMS料金データクリア
DELETE FROM shipping_service_rates WHERE company_code = 'JPPOST' AND service_code = 'EMS';

-- EMS実料金データ投入（CSVから抽出した正確なデータ）
INSERT INTO shipping_service_rates (
    company_code, carrier_code, service_code, country_code, zone_code,
    weight_from_g, weight_to_g, price_jpy, data_source, created_at
) VALUES

-- 第1地帯（中国・韓国・台湾）
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1, 500, 1450, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 501, 600, 1600, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 601, 700, 1750, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 701, 800, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 801, 900, 2050, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 901, 1000, 2200, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1001, 1100, 2350, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1101, 1200, 2500, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1201, 1300, 2650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1301, 1400, 2800, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1401, 1500, 2950, 'official_ems_2025', NOW()),

-- 韓国
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1, 500, 1450, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 501, 600, 1600, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 601, 700, 1750, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 701, 800, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 801, 900, 2050, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 901, 1000, 2200, 'official_ems_2025', NOW()),

-- 台湾
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1, 500, 1450, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 501, 600, 1600, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 601, 700, 1750, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 701, 800, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 801, 900, 2050, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 901, 1000, 2200, 'official_ems_2025', NOW()),

-- 第2地帯（アジア - 中国・韓国・台湾を除く）
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 1, 500, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 501, 600, 2150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 601, 700, 2400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 701, 800, 2650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 801, 900, 2900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 901, 1000, 3150, 'official_ems_2025', NOW()),

-- 香港
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1, 500, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 501, 600, 2150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 601, 700, 2400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 701, 800, 2650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 801, 900, 2900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 901, 1000, 3150, 'official_ems_2025', NOW()),

-- タイ
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 1, 500, 1900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 501, 600, 2150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 601, 700, 2400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 701, 800, 2650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 801, 900, 2900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 901, 1000, 3150, 'official_ems_2025', NOW()),

-- 第3地帯（オセアニア・カナダ・メキシコ・中近東・ヨーロッパ）
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1, 500, 3150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 501, 600, 3400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 601, 700, 3650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 701, 800, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 801, 900, 4150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 901, 1000, 4400, 'official_ems_2025', NOW()),

-- カナダ
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1, 500, 3150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 501, 600, 3400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 601, 700, 3650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 701, 800, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 801, 900, 4150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 901, 1000, 4400, 'official_ems_2025', NOW()),

-- イギリス
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1, 500, 3150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 501, 600, 3400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 601, 700, 3650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 701, 800, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 801, 900, 4150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 901, 1000, 4400, 'official_ems_2025', NOW()),

-- ドイツ
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1, 500, 3150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 501, 600, 3400, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 601, 700, 3650, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 701, 800, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 801, 900, 4150, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 901, 1000, 4400, 'official_ems_2025', NOW()),

-- 第4地帯（米国・グアム等海外領土含む）
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1, 500, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 501, 600, 4180, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 601, 700, 4460, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 701, 800, 4740, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 801, 900, 5020, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 901, 1000, 5300, 'official_ems_2025', NOW()),

-- 第5地帯（中南米・アフリカ）
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1, 500, 3600, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 501, 600, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 601, 700, 4200, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 701, 800, 4500, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 801, 900, 4800, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 901, 1000, 5100, 'official_ems_2025', NOW()),

-- メキシコ（第5地帯）
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 1, 500, 3600, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 501, 600, 3900, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 601, 700, 4200, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 701, 800, 4500, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 801, 900, 4800, 'official_ems_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'MX', '第5地帯', 901, 1000, 5100, 'official_ems_2025', NOW());

-- 投入データ確認
SELECT '=== EMS実データ投入完了 ===' as result;

SELECT 
    'EMS料金データ投入統計' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT country_code) as countries,
    COUNT(DISTINCT zone_code) as zones
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' AND service_code = 'EMS';

-- サンプル確認（アメリカ向けEMS料金）
SELECT 'アメリカ向けEMS料金サンプル:' as test;
SELECT 
    zone_code,
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'US'
ORDER BY weight_from_g
LIMIT 6;

SELECT '✅ EMS実データ投入・確認完了' as final_result;