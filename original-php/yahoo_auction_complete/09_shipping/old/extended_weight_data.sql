-- 重量データ範囲拡張（30kgまで）
-- 既存データを拡張し、全重量帯をカバー

-- 既存の限定的なデータを削除
DELETE FROM real_shipping_rates;

-- 拡張された重量範囲データを投入
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) VALUES

-- ELOGI DHL (30kgまで)
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 1, 500, 2800, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 501, 1000, 3200, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 1001, 1500, 3600, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 1501, 2000, 4000, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 2001, 2500, 4400, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 2501, 3000, 4800, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 3001, 4000, 5600, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 4001, 5000, 6400, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 5001, 6000, 7200, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 6001, 7000, 8000, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 7001, 8000, 8800, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 8001, 9000, 9600, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 9001, 10000, 10400, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 10001, 15000, 14000, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 15001, 20000, 18000, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 20001, 25000, 22000, 'extended_weight_range'),
('ELOGI', 'ELOGI_DHL_EXPRESS', 'zone1', 25001, 30000, 26000, 'extended_weight_range'),

-- SPEEDPAK DHL (30kgまで)
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 1, 500, 1800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 501, 1000, 2200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 1001, 1500, 2600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 1501, 2000, 3000, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 2001, 2500, 3400, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 2501, 3000, 3600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 3001, 4000, 4200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 4001, 5000, 4800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 5001, 6000, 5400, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 6001, 7000, 6000, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 7001, 8000, 6600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 8001, 9000, 7200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 9001, 10000, 7800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 10001, 15000, 10500, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 15001, 20000, 13500, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 20001, 25000, 16500, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_DHL', 'zone1', 25001, 30000, 19500, 'extended_weight_range'),

-- SPEEDPAK ECONOMY (30kgまで)
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1, 500, 1600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 501, 1000, 2000, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1001, 1500, 2400, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 1501, 2000, 2800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 2001, 2500, 3200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 2501, 3000, 3400, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 3001, 4000, 4000, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 4001, 5000, 4600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 5001, 6000, 5200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 6001, 7000, 5800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 7001, 8000, 6400, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 8001, 9000, 7000, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 9001, 10000, 7600, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 10001, 15000, 10200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 15001, 20000, 13200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 20001, 25000, 16200, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_ECONOMY', 'zone1', 25001, 30000, 19200, 'extended_weight_range'),

-- SPEEDPAK FEDEX (30kgまで)
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 1, 500, 1900, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 501, 1000, 2300, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 1001, 1500, 2700, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 1501, 2000, 3100, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 2001, 2500, 3500, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 2501, 3000, 3700, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 3001, 4000, 4300, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 4001, 5000, 4900, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 5001, 6000, 5500, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 6001, 7000, 6100, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 7001, 8000, 6700, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 8001, 9000, 7300, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 9001, 10000, 7900, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 10001, 15000, 10800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 15001, 20000, 13800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 20001, 25000, 16800, 'extended_weight_range'),
('SPEEDPAK', 'SPEEDPAK_FEDEX', 'zone1', 25001, 30000, 19800, 'extended_weight_range'),

-- 日本郵便 EMS (30kgまで)
('JPPOST', 'EMS', 'zone1', 1, 500, 1400, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 501, 1000, 1600, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 1001, 1500, 1800, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 1501, 2000, 2000, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 2001, 2500, 2200, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 2501, 3000, 2400, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 3001, 4000, 2800, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 4001, 5000, 3200, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 5001, 6000, 3600, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 6001, 7000, 4000, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 7001, 8000, 4400, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 8001, 9000, 4800, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 9001, 10000, 5200, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 10001, 15000, 7000, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 15001, 20000, 9000, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 20001, 25000, 11000, 'extended_weight_range'),
('JPPOST', 'EMS', 'zone1', 25001, 30000, 13000, 'extended_weight_range');

-- 投入確認
DO $$
DECLARE
    total_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM real_shipping_rates WHERE data_source = 'extended_weight_range';
    RAISE NOTICE '✅ 拡張重量データ投入完了: % 件', total_records;
    RAISE NOTICE '📊 重量範囲: 0.5kg - 30kg';
    RAISE NOTICE '🏢 対象業者: ELOGI, SPEEDPAK, JPPOST';
END $$;