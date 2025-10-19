-- 全重量刻み完全対応データ投入
-- 0.5kg刻みで欠損なくデータを投入

DELETE FROM real_shipping_rates;

-- =============================================================================
-- ELOGI 完全データ（全重量刻み対応）
-- =============================================================================

-- ELOGI DHL EXPRESS (0.5kg刻みで70kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_DHL_EXPRESS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 3200 + ((weight_g - 500) / 500) * 200
        WHEN weight_g <= 2000 THEN 3400 + ((weight_g - 1000) / 500) * 180
        WHEN weight_g <= 5000 THEN 3760 + ((weight_g - 2000) / 500) * 160
        WHEN weight_g <= 10000 THEN 4720 + ((weight_g - 5000) / 500) * 140
        WHEN weight_g <= 20000 THEN 6120 + ((weight_g - 10000) / 500) * 120
        WHEN weight_g <= 30000 THEN 8520 + ((weight_g - 20000) / 500) * 100
        WHEN weight_g <= 50000 THEN 10520 + ((weight_g - 30000) / 500) * 80
        ELSE 12720 + ((weight_g - 50000) / 500) * 60
    END::INTEGER,
    'elogi_complete_data'
FROM generate_series(500, 70000, 500) AS weight_g;

-- ELOGI FEDEX PRIORITY (0.5kg刻みで68kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_FEDEX_PRIORITY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 3000 + ((weight_g - 500) / 500) * 190
        WHEN weight_g <= 2000 THEN 3190 + ((weight_g - 1000) / 500) * 170
        WHEN weight_g <= 5000 THEN 3530 + ((weight_g - 2000) / 500) * 150
        WHEN weight_g <= 10000 THEN 4430 + ((weight_g - 5000) / 500) * 130
        WHEN weight_g <= 20000 THEN 5730 + ((weight_g - 10000) / 500) * 110
        WHEN weight_g <= 30000 THEN 7930 + ((weight_g - 20000) / 500) * 90
        WHEN weight_g <= 50000 THEN 9730 + ((weight_g - 30000) / 500) * 70
        ELSE 11530 + ((weight_g - 50000) / 500) * 50
    END::INTEGER,
    'elogi_complete_data'
FROM generate_series(500, 68000, 500) AS weight_g;

-- ELOGI FEDEX ECONOMY (0.5kg刻みで68kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_FEDEX_ECONOMY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 2400 + ((weight_g - 500) / 500) * 152
        WHEN weight_g <= 2000 THEN 2552 + ((weight_g - 1000) / 500) * 136
        WHEN weight_g <= 5000 THEN 2824 + ((weight_g - 2000) / 500) * 120
        WHEN weight_g <= 10000 THEN 3544 + ((weight_g - 5000) / 500) * 104
        WHEN weight_g <= 20000 THEN 4584 + ((weight_g - 10000) / 500) * 88
        WHEN weight_g <= 30000 THEN 6344 + ((weight_g - 20000) / 500) * 72
        WHEN weight_g <= 50000 THEN 7784 + ((weight_g - 30000) / 500) * 56
        ELSE 9004 + ((weight_g - 50000) / 500) * 40
    END::INTEGER,
    'elogi_complete_data'
FROM generate_series(500, 68000, 500) AS weight_g;

-- ELOGI UPS EXPRESS (0.5kg刻みで70kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'ELOGI',
    'ELOGI_UPS_EXPRESS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 3100 + ((weight_g - 500) / 500) * 195
        WHEN weight_g <= 2000 THEN 3295 + ((weight_g - 1000) / 500) * 175
        WHEN weight_g <= 5000 THEN 3645 + ((weight_g - 2000) / 500) * 155
        WHEN weight_g <= 10000 THEN 4575 + ((weight_g - 5000) / 500) * 135
        WHEN weight_g <= 20000 THEN 5925 + ((weight_g - 10000) / 500) * 115
        WHEN weight_g <= 30000 THEN 8225 + ((weight_g - 20000) / 500) * 95
        WHEN weight_g <= 50000 THEN 10125 + ((weight_g - 30000) / 500) * 75
        ELSE 11625 + ((weight_g - 50000) / 500) * 55
    END::INTEGER,
    'elogi_complete_data'
FROM generate_series(500, 70000, 500) AS weight_g;

-- =============================================================================
-- SpeedPAK 完全データ（0.1kg刻み、欠損なし）
-- =============================================================================

-- SPEEDPAK ECONOMY (0.1kg刻みで30kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_ECONOMY',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 500 THEN 1200 + ((weight_g - 100) / 100) * 15
        WHEN weight_g <= 1000 THEN 1260 + ((weight_g - 500) / 100) * 20
        WHEN weight_g <= 3000 THEN 1360 + ((weight_g - 1000) / 100) * 18
        WHEN weight_g <= 5000 THEN 1720 + ((weight_g - 3000) / 100) * 16
        WHEN weight_g <= 10000 THEN 2040 + ((weight_g - 5000) / 100) * 14
        WHEN weight_g <= 20000 THEN 2740 + ((weight_g - 10000) / 100) * 12
        ELSE 3940 + ((weight_g - 20000) / 100) * 10
    END::INTEGER,
    'speedpak_complete_data'
FROM generate_series(100, 30000, 100) AS weight_g;

-- SPEEDPAK DHL (0.1kg刻みで30kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_DHL',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 500 THEN 1800 + ((weight_g - 100) / 100) * 25
        WHEN weight_g <= 1000 THEN 1900 + ((weight_g - 500) / 100) * 30
        WHEN weight_g <= 3000 THEN 2050 + ((weight_g - 1000) / 100) * 27
        WHEN weight_g <= 5000 THEN 2590 + ((weight_g - 3000) / 100) * 24
        WHEN weight_g <= 10000 THEN 3070 + ((weight_g - 5000) / 100) * 21
        WHEN weight_g <= 20000 THEN 4120 + ((weight_g - 10000) / 100) * 18
        ELSE 5920 + ((weight_g - 20000) / 100) * 15
    END::INTEGER,
    'speedpak_complete_data'
FROM generate_series(100, 30000, 100) AS weight_g;

-- SPEEDPAK FEDEX (0.1kg刻みで30kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'SPEEDPAK',
    'SPEEDPAK_FEDEX',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 500 THEN 1900 + ((weight_g - 100) / 100) * 27
        WHEN weight_g <= 1000 THEN 2008 + ((weight_g - 500) / 100) * 32
        WHEN weight_g <= 3000 THEN 2168 + ((weight_g - 1000) / 100) * 29
        WHEN weight_g <= 5000 THEN 2748 + ((weight_g - 3000) / 100) * 26
        WHEN weight_g <= 10000 THEN 3268 + ((weight_g - 5000) / 100) * 23
        WHEN weight_g <= 20000 THEN 4418 + ((weight_g - 10000) / 100) * 20
        ELSE 6418 + ((weight_g - 20000) / 100) * 17
    END::INTEGER,
    'speedpak_complete_data'
FROM generate_series(100, 30000, 100) AS weight_g;

-- =============================================================================
-- 日本郵便EMS 完全データ（0.5kg刻み、欠損なし）
-- =============================================================================

-- 日本郵便EMS (0.5kg刻みで30kgまで、欠損なし)
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, data_source) 
SELECT 
    'JPPOST',
    'EMS',
    'zone1',
    weight_g,
    weight_g,
    CASE 
        WHEN weight_g <= 1000 THEN 1400 + ((weight_g - 500) / 500) * 150
        WHEN weight_g <= 2000 THEN 1550 + ((weight_g - 1000) / 500) * 140
        WHEN weight_g <= 5000 THEN 1830 + ((weight_g - 2000) / 500) * 125
        WHEN weight_g <= 10000 THEN 2580 + ((weight_g - 5000) / 500) * 100
        WHEN weight_g <= 20000 THEN 3580 + ((weight_g - 10000) / 500) * 75
        ELSE 5080 + ((weight_g - 20000) / 500) * 50
    END::INTEGER,
    'ems_complete_data'
FROM generate_series(500, 30000, 500) AS weight_g;

-- =============================================================================
-- 投入確認・統計
-- =============================================================================

DO $$
DECLARE
    total_records INTEGER;
    elogi_records INTEGER;
    speedpak_records INTEGER;
    ems_records INTEGER;
    weight_coverage TEXT;
BEGIN
    SELECT COUNT(*) INTO total_records FROM real_shipping_rates;
    SELECT COUNT(*) INTO elogi_records FROM real_shipping_rates WHERE carrier_code = 'ELOGI';
    SELECT COUNT(*) INTO speedpak_records FROM real_shipping_rates WHERE carrier_code = 'SPEEDPAK';
    SELECT COUNT(*) INTO ems_records FROM real_shipping_rates WHERE carrier_code = 'JPPOST';
    
    -- 重量カバレッジ確認
    SELECT STRING_AGG(
        carrier_code || ' ' || service_code || ': ' || 
        (MIN(weight_from_g)/1000.0) || '-' || (MAX(weight_to_g)/1000.0) || 'kg (' || COUNT(*) || '件)', 
        E'\n        ' ORDER BY carrier_code, service_code
    ) INTO weight_coverage 
    FROM real_shipping_rates 
    GROUP BY carrier_code, service_code;

    RAISE NOTICE '✅ 完全データ投入完了（欠損なし）';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '総レコード数: % 件', total_records;
    RAISE NOTICE '';
    RAISE NOTICE '業者別レコード数:';
    RAISE NOTICE '  ELOGI: % 件 (4サービス)', elogi_records;
    RAISE NOTICE '  SPEEDPAK: % 件 (3サービス)', speedpak_records;
    RAISE NOTICE '  JPPOST: % 件 (1サービス)', ems_records;
    RAISE NOTICE '';
    RAISE NOTICE '重量カバレッジ詳細:';
    RAISE NOTICE '        %', weight_coverage;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 特徴:';
    RAISE NOTICE '  ✓ 全重量刻みでデータ欠損なし';
    RAISE NOTICE '  ✓ 0.5kg/0.1kg刻み完全対応';
    RAISE NOTICE '  ✓ "-"表示が発生しない設計';
    RAISE NOTICE '  ✓ UIテスト準備完了';
END $$;