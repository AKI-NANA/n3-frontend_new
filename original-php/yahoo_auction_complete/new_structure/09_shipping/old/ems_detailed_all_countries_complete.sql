-- EMS全国詳細重量区分データ投入（USA基準）完全版パート2
-- ファイル: ems_detailed_weights_part2.sql

-- 🇺🇸 アメリカ（第4地帯）詳細重量区分（続き）
INSERT INTO shipping_service_rates (
    company_code, carrier_code, service_code, country_code, zone_code,
    weight_from_g, weight_to_g, price_jpy, data_source, created_at
) VALUES

('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 801, 900, 5020, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 901, 1000, 5300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1001, 1250, 5990, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1251, 1500, 6600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1501, 1750, 7290, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 1751, 2000, 7900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 2001, 2500, 9100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 2501, 3000, 10300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 3001, 3500, 11500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 3501, 4000, 12700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 4001, 4500, 13900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 4501, 5000, 15100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 5001, 5500, 16300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 5501, 6000, 17500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 6001, 7000, 19900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 7001, 8000, 22300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 8001, 9000, 24700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 9001, 10000, 27100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 10001, 11000, 29500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 11001, 12000, 31900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 12001, 13000, 34300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 13001, 14000, 36700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 14001, 15000, 39100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 15001, 16000, 41500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 16001, 17000, 43900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 17001, 18000, 46300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 18001, 19000, 48700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 19001, 20000, 51100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 20001, 21000, 53500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 21001, 22000, 55900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 22001, 23000, 58300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 23001, 24000, 60700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 24001, 25000, 63100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 25001, 26000, 65500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 26001, 27000, 67900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 27001, 28000, 70300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 28001, 29000, 72700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'US', '第4地帯', 29001, 30000, 75100, 'ems_csv_detailed_2025', NOW()),

-- 🇨🇦 カナダ（第3地帯）詳細重量区分 - オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1, 500, 3150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 501, 600, 3400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 601, 700, 3650, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 701, 800, 3900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 801, 900, 4150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 901, 1000, 4400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1001, 1250, 5000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1251, 1500, 5550, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1501, 1750, 6150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 1751, 2000, 6700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 2001, 2500, 7750, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 2501, 3000, 8800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 3001, 3500, 9850, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 3501, 4000, 10900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 4001, 4500, 11950, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 4501, 5000, 13000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 5001, 5500, 14050, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 5501, 6000, 15100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 6001, 7000, 17200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 7001, 8000, 19300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 8001, 9000, 21400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 9001, 10000, 23500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 10001, 11000, 25600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 11001, 12000, 27700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 12001, 13000, 29800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 13001, 14000, 31900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 14001, 15000, 34000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 15001, 16000, 36100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 16001, 17000, 38200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 17001, 18000, 40300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 18001, 19000, 42400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 19001, 20000, 44500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 20001, 21000, 46600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 21001, 22000, 48700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 22001, 23000, 50800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 23001, 24000, 52900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 24001, 25000, 55000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 25001, 26000, 57100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 26001, 27000, 59200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 27001, 28000, 61300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 28001, 29000, 63400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'CA', '第3地帯', 29001, 30000, 65500, 'ems_csv_detailed_2025', NOW()),

-- 🇬🇧 イギリス（第3地帯）詳細重量区分 - オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1, 500, 3150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 501, 600, 3400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 601, 700, 3650, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 701, 800, 3900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 801, 900, 4150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 901, 1000, 4400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1001, 1250, 5000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1251, 1500, 5550, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1501, 1750, 6150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 1751, 2000, 6700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 2001, 2500, 7750, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 2501, 3000, 8800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 3001, 3500, 9850, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 3501, 4000, 10900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 4001, 4500, 11950, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 4501, 5000, 13000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 5001, 5500, 14050, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 5501, 6000, 15100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 6001, 7000, 17200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 7001, 8000, 19300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 8001, 9000, 21400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 9001, 10000, 23500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 10001, 11000, 25600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 11001, 12000, 27700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 12001, 13000, 29800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 13001, 14000, 31900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 14001, 15000, 34000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 15001, 16000, 36100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 16001, 17000, 38200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 17001, 18000, 40300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 18001, 19000, 42400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 19001, 20000, 44500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 20001, 21000, 46600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 21001, 22000, 48700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 22001, 23000, 50800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 23001, 24000, 52900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 24001, 25000, 55000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 25001, 26000, 57100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 26001, 27000, 59200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 27001, 28000, 61300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 28001, 29000, 63400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'GB', '第3地帯', 29001, 30000, 65500, 'ems_csv_detailed_2025', NOW()),

-- 🇩🇪 ドイツ（第3地帯）詳細重量区分 - オーストラリアと同じ料金
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1, 500, 3150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 501, 600, 3400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 601, 700, 3650, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 701, 800, 3900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 801, 900, 4150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 901, 1000, 4400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1001, 1250, 5000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1251, 1500, 5550, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1501, 1750, 6150, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 1751, 2000, 6700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 2001, 2500, 7750, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 2501, 3000, 8800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 3001, 3500, 9850, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 3501, 4000, 10900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 4001, 4500, 11950, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 4501, 5000, 13000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 5001, 5500, 14050, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 5501, 6000, 15100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 6001, 7000, 17200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 7001, 8000, 19300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 8001, 9000, 21400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 9001, 10000, 23500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 10001, 11000, 25600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 11001, 12000, 27700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 12001, 13000, 29800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 13001, 14000, 31900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 14001, 15000, 34000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 15001, 16000, 36100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 16001, 17000, 38200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 17001, 18000, 40300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 18001, 19000, 42400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 19001, 20000, 44500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 20001, 21000, 46600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 21001, 22000, 48700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 22001, 23000, 50800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 23001, 24000, 52900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 24001, 25000, 55000, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 25001, 26000, 57100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 26001, 27000, 59200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 27001, 28000, 61300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 28001, 29000, 63400, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'DE', '第3地帯', 29001, 30000, 65500, 'ems_csv_detailed_2025', NOW()),

-- 🇧🇷 ブラジル（第5地帯）詳細重量区分
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1, 500, 3600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 501, 600, 3900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 601, 700, 4200, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 701, 800, 4500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 801, 900, 4800, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 901, 1000, 5100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1001, 1250, 5850, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1251, 1500, 6600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1501, 1750, 7350, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 1751, 2000, 8100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 2001, 2500, 9600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 2501, 3000, 11100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 3001, 3500, 12600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 3501, 4000, 14100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 4001, 4500, 15600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 4501, 5000, 17100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 5001, 5500, 18600, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 5501, 6000, 20100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 6001, 7000, 22500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 7001, 8000, 24900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 8001, 9000, 27300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 9001, 10000, 29700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 10001, 11000, 32100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 11001, 12000, 34500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 12001, 13000, 36900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 13001, 14000, 39300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 14001, 15000, 41700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 15001, 16000, 44100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 16001, 17000, 46500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 17001, 18000, 48900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 18001, 19000, 51300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 19001, 20000, 53700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 20001, 21000, 56100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 21001, 22000, 58500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 22001, 23000, 60900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 23001, 24000, 63300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 24001, 25000, 65700, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 25001, 26000, 68100, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 26001, 27000, 70500, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 27001, 28000, 72900, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 28001, 29000, 75300, 'ems_csv_detailed_2025', NOW()),
('JPPOST', 'EMS', 'EMS', 'BR', '第5地帯', 29001, 30000, 77700, 'ems_csv_detailed_2025', NOW());

-- 投入確認
SELECT '=== EMS全国詳細重量区分データ投入完了 ===' as result;

-- 投入統計
SELECT 
    'EMS詳細重量区分統計' as metric,
    COUNT(*) as total_records,
    COUNT(DISTINCT country_code) as countries,
    COUNT(DISTINCT zone_code) as zones,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' AND service_code = 'EMS';

-- 地帯別レコード数確認
SELECT 
    zone_code,
    COUNT(*) as record_count,
    COUNT(DISTINCT country_code) as country_count,
    MIN(price_jpy) as min_price,
    MAX(price_jpy) as max_price
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' AND service_code = 'EMS'
GROUP BY zone_code
ORDER BY zone_code;

-- 各国料金サンプル確認（500g, 1kg, 5kg, 10kg）
SELECT 'アメリカ（第4地帯）料金サンプル:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'US'
  AND weight_to_g IN (500, 1000, 5000, 10000)
ORDER BY weight_from_g;

SELECT 'オーストラリア（第3地帯）料金サンプル:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'AU'
  AND weight_to_g IN (500, 1000, 5000, 10000)
ORDER BY weight_from_g;

SELECT 'タイ（第2地帯）料金サンプル:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'TH'
  AND weight_to_g IN (500, 1000, 5000, 10000)
ORDER BY weight_from_g;

SELECT 'ブラジル（第5地帯）料金サンプル:' as test;
SELECT 
    weight_from_g || 'g-' || weight_to_g || 'g' as weight_range,
    '¥' || price_jpy as price_yen
FROM shipping_service_rates 
WHERE company_code = 'JPPOST' 
  AND service_code = 'EMS' 
  AND country_code = 'BR'
  AND weight_to_g IN (500, 1000, 5000, 10000)
ORDER BY weight_from_g;

SELECT '✅ EMS全国詳細重量区分データ投入完了' as final_result;