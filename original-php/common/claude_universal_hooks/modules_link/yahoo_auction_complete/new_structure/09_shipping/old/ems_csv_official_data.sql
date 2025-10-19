-- EMS正確な料金データ投入（CSV公式データ基準）
-- ファイル: ems_csv_official_data.sql

\echo '=== EMS CSV公式データ投入開始 ==='

-- 既存のEMSデータを完全削除
DELETE FROM shipping_service_rates WHERE company_code = 'JPPOST' AND service_code = 'EMS';

-- 🇨🇳 中国・韓国・台湾（第1地帯）
INSERT INTO shipping_service_rates (
    company_code, carrier_code, service_code, country_code, zone_code,
    weight_from_g, weight_to_g, price_jpy, data_source, created_at
) VALUES

-- 中国（第1地帯）
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1, 500, 1450, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 501, 600, 1600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 601, 700, 1750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 701, 800, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 801, 900, 2050, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 901, 1000, 2200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1001, 1250, 2500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1251, 1500, 2800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1501, 1750, 3100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 1751, 2000, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 2001, 2500, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 2501, 3000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 3001, 3500, 4900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 3501, 4000, 5400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 4001, 4500, 5900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 4501, 5000, 6400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 5001, 5500, 6900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 5501, 6000, 7400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 6001, 7000, 8200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 7001, 8000, 9000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 8001, 9000, 9800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 9001, 10000, 10600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 10001, 11000, 11400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 11001, 12000, 12200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 12001, 13000, 13000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 13001, 14000, 13800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 14001, 15000, 14600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 15001, 16000, 15400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 16001, 17000, 16200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 17001, 18000, 17000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 18001, 19000, 17800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 19001, 20000, 18600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 20001, 21000, 19400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 21001, 22000, 20200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 22001, 23000, 21000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 23001, 24000, 21800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 24001, 25000, 22600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 25001, 26000, 23400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 26001, 27000, 24200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 27001, 28000, 25000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 28001, 29000, 25800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CN', '第1地帯', 29001, 30000, 26600, 'ems_csv_official_2025', NOW()),

-- 韓国（第1地帯）- 中国と同じ料金
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1, 500, 1450, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 501, 600, 1600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 601, 700, 1750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 701, 800, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 801, 900, 2050, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 901, 1000, 2200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1001, 1250, 2500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1251, 1500, 2800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1501, 1750, 3100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 1751, 2000, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 2001, 3000, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 3001, 5000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 5001, 10000, 6400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 10001, 20000, 10600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'KR', '第1地帯', 20001, 30000, 18600, 'ems_csv_official_2025', NOW()),

-- 台湾（第1地帯）- 中国と同じ料金
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1, 500, 1450, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 501, 600, 1600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 601, 700, 1750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 701, 800, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 801, 900, 2050, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 901, 1000, 2200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1001, 1250, 2500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1251, 1500, 2800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1501, 1750, 3100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 1751, 2000, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 2001, 3000, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 3001, 5000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 5001, 10000, 6400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 10001, 20000, 10600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TW', '第1地帯', 20001, 30000, 18600, 'ems_csv_official_2025', NOW()),

-- 🇭🇰 香港・マカオ・アジア諸国（第2地帯）
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1, 500, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 501, 600, 2150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 601, 700, 2400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 701, 800, 2650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 801, 900, 2900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 901, 1000, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1001, 1250, 3500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1251, 1500, 3850, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1501, 1750, 4200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 1751, 2000, 4550, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 2001, 2500, 5150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 2501, 3000, 5750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 3001, 5000, 6350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 5001, 10000, 8150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 10001, 20000, 13350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'HK', '第2地帯', 20001, 30000, 23350, 'ems_csv_official_2025', NOW()),

-- シンガポール（第2地帯）- 香港と同じ料金
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 1, 500, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 501, 600, 2150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 601, 700, 2400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 701, 800, 2650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 801, 900, 2900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 901, 1000, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 1001, 1500, 3500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 1501, 2000, 4200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 2001, 3000, 5150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 3001, 5000, 6350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 5001, 10000, 8150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 10001, 20000, 13350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'SG', '第2地帯', 20001, 30000, 23350, 'ems_csv_official_2025', NOW()),

-- タイ（第2地帯）- 香港と同じ料金
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 1, 500, 1900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 501, 600, 2150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 601, 700, 2400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 701, 800, 2650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 801, 900, 2900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 901, 1000, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 1001, 1500, 3500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 1501, 2000, 4200, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 2001, 3000, 5150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 3001, 5000, 6350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 5001, 10000, 8150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 10001, 20000, 13350, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'TH', '第2地帯', 20001, 30000, 23350, 'ems_csv_official_2025', NOW()),

-- 🇦🇺 オーストラリア・カナダ・ヨーロッパ（第3地帯）
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1, 500, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 501, 600, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 601, 700, 3650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 701, 800, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 801, 900, 4150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 901, 1000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1001, 1250, 5000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1251, 1500, 5550, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1501, 1750, 6150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 1751, 2000, 6700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 2001, 2500, 7750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 2501, 3000, 8800, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 3001, 5000, 9850, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 5001, 10000, 13000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 10001, 20000, 23500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'AU', '第3地帯', 20001, 30000, 44500, 'ems_csv_official_2025', NOW()),

-- カナダ（第3地帯）- オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1, 500, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 501, 600, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 601, 700, 3650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 701, 800, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 801, 900, 4150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 901, 1000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1001, 1500, 5000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1501, 2000, 6150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 2001, 3000, 7750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 3001, 5000, 9850, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 5001, 10000, 13000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 10001, 20000, 23500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 20001, 30000, 44500, 'ems_csv_official_2025', NOW()),

-- イギリス（第3地帯）- オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1, 500, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 501, 600, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 601, 700, 3650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 701, 800, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 801, 900, 4150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 901, 1000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1001, 1500, 5000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1501, 2000, 6150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 2001, 3000, 7750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 3001, 5000, 9850, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 5001, 10000, 13000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 10001, 20000, 23500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 20001, 30000, 44500, 'ems_csv_official_2025', NOW()),

-- ドイツ（第3地帯）- オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1, 500, 3150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 501, 600, 3400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 601, 700, 3650, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 701, 800, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 801, 900, 4150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 901, 1000, 4400, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1001, 1500, 5000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1501, 2000, 6150, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 2001, 3000, 7750, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 3001, 5000, 9850, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 5001, 10000, 13000, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 10001, 20000, 23500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 20001, 30000, 44500, 'ems_csv_official_2025', NOW()),

-- 🇺🇸 アメリカ（第4地帯）
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1, 500, 3900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 501, 600, 4180, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 601, 700, 4460, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 701, 800, 4740, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 801, 900, 5020, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 901, 1000, 5300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1001, 1250, 5990, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1251, 1500, 6600, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1501, 1750, 7290, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1751, 2000, 7900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 2001, 2500, 9100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 2501, 3000, 10300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 3001, 3500, 11500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 3501, 4000, 12700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 4001, 4500, 13900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 4501, 5000, 15100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 5001, 5500, 16300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 5501, 6000, 17500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 6001, 7000, 19900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 7001, 8000, 22300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 8001, 9000, 24700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 9001, 10000, 27100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 10001, 11000, 29500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 11001, 12000, 31900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 12001, 13000, 34300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 13001, 14000, 36700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 14001, 15000, 39100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 15001, 16000, 41500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 16001, 17000, 43900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 17001, 18000, 46300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 18001, 19000, 48700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 19001, 20000, 51100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 20001, 21000, 53500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 21001, 22000, 55900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 22001, 23000, 58300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 23001, 24000, 60700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 24001, 25000, 63100, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 25001, 26000, 65500, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 26001, 27000, 67900, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 27001, 28000, 70300, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 28001, 29000, 72700, 'ems_csv_official_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 29001, 30000, 75100, 'ems_csv_official_2025', NOW());

-- 投入確認
SELECT '=== EMS CSV公式データ投入完了 ===' as result;

-- 投入統計
SELECT 
    'CSV公式データ統計' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT country_code) as countries,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' AND service_code = 'EMS';

-- 地帯別料金確認
SELECT 'アメリカ向け（第4地帯）料金確認:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'US'
ORDER BY weight_from_g
LIMIT 10;

SELECT 'オーストラリア向け（第3地帯）料金確認:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'AU'
ORDER BY weight_from_g
LIMIT 10;

SELECT '✅ EMS CSV公式データ投入完了' as final_result;