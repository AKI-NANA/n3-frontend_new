-- 0.5kg刻み70kgまでの完全データ投入
-- eLogiの0.5kg刻み対応

DELETE FROM real_shipping_rates;

-- ELOGI DHL EXPRESS (0.5kg刻みで70kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_DHL_EXPRESS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 2000 THEN 3200 + ((weight_g - 500) / 500) * 200
        WHEN weight_g <= 5000 THEN 3800 + ((weight_g - 2000) / 500) * 175
        WHEN weight_g <= 10000 THEN 4850 + ((weight_g - 5000) / 500) * 150
        WHEN weight_g <= 20000 THEN 6350 + ((weight_g - 10000) / 500) * 125
        WHEN weight_g <= 30000 THEN 8850 + ((weight_g - 20000) / 500) * 100
        WHEN weight_g <= 50000 THEN 10850 + ((weight_g - 30000) / 500) * 75
        ELSE 12350 + ((weight_g - 50000) / 500) * 50
    END::INTEGER,
    'elogi_0.5kg_increment'
FROM generate_series(500, 70000, 500) AS weight_g;

-- ELOGI FEDEX PRIORITY (0.5kg刻みで68kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_FEDEX_PRIORITY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 2000 THEN 3000 + ((weight_g - 500) / 500) * 190
        WHEN weight_g <= 5000 THEN 3570 + ((weight_g - 2000) / 500) * 165
        WHEN weight_g <= 10000 THEN 4560 + ((weight_g - 5000) / 500) * 140
        WHEN weight_g <= 20000 THEN 5960 + ((weight_g - 10000) / 500) * 115
        WHEN weight_g <= 30000 THEN 8260 + ((weight_g - 20000) / 500) * 90
        WHEN weight_g <= 50000 THEN 10060 + ((weight_g - 30000) / 500) * 70
        ELSE 12860 + ((weight_g - 50000) / 500) * 45
    END::INTEGER,
    'elogi_0.5kg_increment'
FROM generate_series(500, 68000, 500) AS weight_g;

-- ELOGI FEDEX ECONOMY (0.5kg刻みで68kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_FEDEX_ECONOMY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 2000 THEN 2400 + ((weight_g - 500) / 500) * 152
        WHEN weight_g <= 5000 THEN 2856 + ((weight_g - 2000) / 500) * 132
        WHEN weight_g <= 10000 THEN 3648 + ((weight_g - 5000) / 500) * 112
        WHEN weight_g <= 20000 THEN 4768 + ((weight_g - 10000) / 500) * 92
        WHEN weight_g <= 30000 THEN 6608 + ((weight_g - 20000) / 500) * 72
        WHEN weight_g <= 50000 THEN 8048 + ((weight_g - 30000) / 500) * 56
        ELSE 10288 + ((weight_g - 50000) / 500) * 36
    END::INTEGER,
    'elogi_0.5kg_increment'
FROM generate_series(500, 68000, 500) AS weight_g;

-- ELOGI UPS EXPRESS (0.5kg刻みで70kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_UPS_EXPRESS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 2000 THEN 3100 + ((weight_g - 500) / 500) * 195
        WHEN weight_g <= 5000 THEN 3685 + ((weight_g - 2000) / 500) * 170
        WHEN weight_g <= 10000 THEN 4705 + ((weight_g - 5000) / 500) * 145
        WHEN weight_g <= 20000 THEN 6155 + ((weight_g - 10000) / 500) * 120
        WHEN weight_g <= 30000 THEN 8555 + ((weight_g - 20000) / 500) * 95
        WHEN weight_g <= 50000 THEN 10455 + ((weight_g - 30000) / 500) * 75
        ELSE 12455 + ((weight_g - 50000) / 500) * 55
    END::INTEGER,
    'elogi_0.5kg_increment'
FROM generate_series(500, 70000, 500) AS weight_g;

-- SPEEDPAK系 (0.1kg刻みで30kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_ECONOMY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 1200 + ((weight_g - 100) / 100) * 20
        WHEN weight_g <= 3000 THEN 1380 + ((weight_g - 1000) / 100) * 18
        WHEN weight_g <= 5000 THEN 1740 + ((weight_g - 3000) / 100) * 16
        WHEN weight_g <= 10000 THEN 2060 + ((weight_g - 5000) / 100) * 14
        WHEN weight_g <= 20000 THEN 2760 + ((weight_g - 10000) / 100) * 12
        ELSE 3960 + ((weight_g - 20000) / 100) * 10
    END::INTEGER,
    'speedpak_0.1kg_increment'
FROM generate_series(100, 30000, 100) AS weight_g;

INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_DHL',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 1800 + ((weight_g - 100) / 100) * 30
        WHEN weight_g <= 3000 THEN 2070 + ((weight_g - 1000) / 100) * 27
        WHEN weight_g <= 5000 THEN 2610 + ((weight_g - 3000) / 100) * 24
        WHEN weight_g <= 10000 THEN 3090 + ((weight_g - 5000) / 100) * 21
        WHEN weight_g <= 20000 THEN 4140 + ((weight_g - 10000) / 100) * 18
        ELSE 5940 + ((weight_g - 20000) / 100) * 15
    END::INTEGER,
    'speedpak_0.1kg_increment'
FROM generate_series(100, 30000, 100) AS weight_g;

INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_FEDEX',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 1900 + ((weight_g - 100) / 100) * 32
        WHEN weight_g <= 3000 THEN 2188 + ((weight_g - 1000) / 100) * 29
        WHEN weight_g <= 5000 THEN 2768 + ((weight_g - 3000) / 100) * 26
        WHEN weight_g <= 10000 THEN 3288 + ((weight_g - 5000) / 100) * 23
        WHEN weight_g <= 20000 THEN 4438 + ((weight_g - 10000) / 100) * 20
        ELSE 6438 + ((weight_g - 20000) / 100) * 17
    END::INTEGER,
    'speedpak_0.1kg_increment'
FROM generate_series(100, 30000, 100) AS weight_g;

-- 日本郵便EMS (0.5kg刻みで30kgまで)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'JPPOST',
    'EMS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 2000 THEN 1400 + ((weight_g - 500) / 500) * 150
        WHEN weight_g <= 5000 THEN 1850 + ((weight_g - 2000) / 500) * 125
        WHEN weight_g <= 10000 THEN 2600 + ((weight_g - 5000) / 500) * 100
        WHEN weight_g <= 20000 THEN 3600 + ((weight_g - 10000) / 500) * 75
        ELSE 5100 + ((weight_g - 20000) / 500) * 50
    END::INTEGER,
    'ems_0.5kg_increment'
FROM generate_series(500, 30000, 500) AS weight_g;

-- 投入確認
DO $$
DECLARE
    total_records INTEGER;
    elogi_records INTEGER;
    speedpak_records INTEGER;
    ems_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM real_shipping_rates;
    SELECT COUNT(*) INTO elogi_records FROM real_shipping_rates WHERE carrier_code = 'ELOGI';
    SELECT COUNT(*) INTO speedpak_records FROM real_shipping_rates WHERE carrier_code = 'SPEEDPAK';
    SELECT COUNT(*) INTO ems_records FROM real_shipping_rates WHERE carrier_code = 'JPPOST';

    RAISE NOTICE '✅ 0.5kg刻み完全データ投入完了';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '総レコード数: % 件', total_records;
    RAISE NOTICE 'ELOGI: % 件 (DHL 70kg, FedEx 68kg, UPS 70kg)', elogi_records;
    RAISE NOTICE 'SPEEDPAK: % 件 (30kg, 0.1kg刻み)', speedpak_records;
    RAISE NOTICE 'EMS: % 件 (30kg, 0.5kg刻み)', ems_records;
    RAISE NOTICE '';
    RAISE NOTICE '📊 重量対応:';
    RAISE NOTICE '   ELOGI DHL/UPS: 0.5kg - 70kg (0.5kg刻み)';
    RAISE NOTICE '   ELOGI FedEx: 0.5kg - 68kg (0.5kg刻み)';
    RAISE NOTICE '   SpeedPAK: 0.1kg - 30kg (0.1kg刻み)';
    RAISE NOTICE '   EMS: 0.5kg - 30kg (0.5kg刻み)';
END $$;