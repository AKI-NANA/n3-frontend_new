-- CPassスピードパック 完全料金データ投入
-- ソース: RATE GUIDE of eBay SpeedPAK Economy-JP.pdf (正確抽出版)

-- 既存データ完全削除
DROP TABLE IF EXISTS real_shipping_rates CASCADE;

-- テーブル再作成（正しい構造で）
CREATE TABLE real_shipping_rates (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    zone_code VARCHAR(10) NOT NULL DEFAULT 'zone1',
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    delivery_days VARCHAR(20),
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT TRUE,
    data_source VARCHAR(100),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_real_shipping_rates_carrier ON real_shipping_rates(carrier_code);
CREATE INDEX idx_real_shipping_rates_service ON real_shipping_rates(service_code);
CREATE INDEX idx_real_shipping_rates_weight ON real_shipping_rates(weight_from_g, weight_to_g);

-- =============================================================================
-- CPass SpeedPAK Economy USA 本土48州（PDF正確データ）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 100, 100, 1227, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 200, 200, 1367, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 300, 300, 1581, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 400, 400, 1778, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 500, 500, 2060, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 600, 600, 2222, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 700, 700, 2321, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 800, 800, 2703, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 900, 900, 2820, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 1000, 1000, 3020, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 1500, 1500, 3816, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 2000, 2000, 5245, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 2500, 2500, 5582, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 3000, 3000, 6333, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 4000, 4000, 7704, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 5000, 5000, 11733, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 6000, 6000, 13335, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 7000, 7000, 15209, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 8000, 8000, 16893, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 9000, 9000, 18152, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 10000, 10000, 19639, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 11000, 11000, 20864, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 12000, 12000, 22199, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 13000, 13000, 23466, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 14000, 14000, 24869, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 15000, 15000, 25988, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 16000, 16000, 28149, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 17000, 17000, 29495, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 18000, 18000, 30902, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 19000, 19000, 32204, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 20000, 20000, 33947, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 21000, 21000, 35426, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 22000, 22000, 36859, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 23000, 23000, 38516, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 24000, 24000, 39678, '8-12営業日', 'pdf_cpass_speedpak_us_48states'),
('CPASS', 'SPEEDPAK_ECONOMY_US', 'zone1', 25000, 25000, 40955, '8-12営業日', 'pdf_cpass_speedpak_us_48states');

-- =============================================================================
-- CPass SpeedPAK Economy USA 本土48州以外（PDF正確データ）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 100, 100, 1300, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 200, 200, 1477, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 300, 300, 1806, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 400, 400, 2126, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 500, 500, 2622, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 1000, 1000, 4076, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 1500, 1500, 5200, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 2000, 2000, 5805, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 2500, 2500, 6070, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 3000, 3000, 6986, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 4000, 4000, 8705, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 5000, 5000, 11733, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 10000, 10000, 20029, '8-15営業日', 'pdf_cpass_speedpak_us_outside'),
('CPASS', 'SPEEDPAK_ECONOMY_US_OUTSIDE', 'zone1', 15000, 15000, 28157, '8-15営業日', 'pdf_cpass_speedpak_us_outside');

-- =============================================================================
-- CPass SpeedPAK Economy イギリス（PDF正確データ）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 100, 100, 938, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 500, 500, 1571, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 1000, 1000, 2240, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 2000, 2000, 3620, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 3000, 3000, 5095, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 5000, 5000, 7810, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 10000, 10000, 14474, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 15000, 15000, 21362, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 20000, 20000, 28100, '7-10営業日', 'pdf_cpass_speedpak_uk'),
('CPASS', 'SPEEDPAK_ECONOMY_UK', 'zone1', 25000, 25000, 37410, '7-10営業日', 'pdf_cpass_speedpak_uk');

-- =============================================================================
-- CPass SpeedPAK Economy ドイツ（PDF正確データ）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 100, 100, 1336, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 500, 500, 1769, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 1000, 1000, 2273, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 2000, 2000, 4092, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 3000, 3000, 5092, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 5000, 5000, 7524, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 10000, 10000, 13805, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 15000, 15000, 20107, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 20000, 20000, 26451, '7-11営業日', 'pdf_cpass_speedpak_de'),
('CPASS', 'SPEEDPAK_ECONOMY_DE', 'zone1', 25000, 25000, 30511, '7-11営業日', 'pdf_cpass_speedpak_de');

-- =============================================================================
-- CPass SpeedPAK Economy オーストラリア（PDF正確データ）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 100, 100, 1142, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 500, 500, 1630, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 1000, 1000, 2068, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 2000, 2000, 3153, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 3000, 3000, 3507, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 5000, 5000, 5290, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 10000, 10000, 8573, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 15000, 15000, 11230, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 20000, 20000, 15176, '6-12営業日', 'pdf_cpass_speedpak_au'),
('CPASS', 'SPEEDPAK_ECONOMY_AU', 'zone1', 25000, 25000, 16960, '6-12営業日', 'pdf_cpass_speedpak_au');

-- =============================================================================
-- 推定データ（eLogi、EMS）
-- =============================================================================
INSERT INTO real_shipping_rates (carrier_code, service_code, zone_code, weight_from_g, weight_to_g, price_jpy, delivery_days, data_source) VALUES
-- eLogi DHL Express (推定値)
('ELOGI', 'DHL_EXPRESS', 'zone1', 500, 500, 3200, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 1000, 1000, 3400, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 2000, 2000, 3800, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 3000, 3000, 4200, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 5000, 5000, 5000, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 10000, 10000, 8000, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 15000, 15000, 12000, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 20000, 20000, 16000, '1-3営業日', 'estimated_elogi'),
('ELOGI', 'DHL_EXPRESS', 'zone1', 25000, 25000, 20000, '1-3営業日', 'estimated_elogi'),

-- EMS (推定値)
('JPPOST', 'EMS', 'zone1', 500, 500, 1400, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 1000, 1000, 1550, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 2000, 2000, 1830, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 3000, 3000, 2200, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 5000, 5000, 3000, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 10000, 10000, 5500, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 15000, 15000, 8000, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 20000, 20000, 10500, '3-6営業日', 'estimated_jppost'),
('JPPOST', 'EMS', 'zone1', 25000, 25000, 13000, '3-6営業日', 'estimated_jppost');

-- 投入確認
DO $$
DECLARE
    total_records INTEGER;
    cpass_records INTEGER;
    elogi_records INTEGER;
    jppost_records INTEGER;
    services_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM real_shipping_rates;
    SELECT COUNT(*) INTO cpass_records FROM real_shipping_rates WHERE carrier_code = 'CPASS';
    SELECT COUNT(*) INTO elogi_records FROM real_shipping_rates WHERE carrier_code = 'ELOGI';
    SELECT COUNT(*) INTO jppost_records FROM real_shipping_rates WHERE carrier_code = 'JPPOST';
    SELECT COUNT(DISTINCT service_code) INTO services_count FROM real_shipping_rates;

    RAISE NOTICE '✅ CPassスピードパック料金データ投入完了';
    RAISE NOTICE '================================================';
    RAISE NOTICE '総レコード数: % 件', total_records;
    RAISE NOTICE 'CPass SpeedPAK: % 件 (4サービス)', cpass_records;
    RAISE NOTICE 'eLogi: % 件 (推定値)', elogi_records;
    RAISE NOTICE 'JP Post EMS: % 件 (推定値)', jppost_records;
    RAISE NOTICE 'サービス総数: % サービス', services_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 CPassスピードパック4種類:';
    RAISE NOTICE '  🇺🇸 SPEEDPAK_ECONOMY_US (本土48州)';
    RAISE NOTICE '  🇺🇸 SPEEDPAK_ECONOMY_US_OUTSIDE (本土外)';
    RAISE NOTICE '  🇬🇧 SPEEDPAK_ECONOMY_UK (イギリス)';
    RAISE NOTICE '  🇩🇪 SPEEDPAK_ECONOMY_DE (ドイツ)';
    RAISE NOTICE '  🇦🇺 SPEEDPAK_ECONOMY_AU (オーストラリア)';
    RAISE NOTICE '';
    RAISE NOTICE '💰 料金範囲: ¥938 - ¥40,955';
    RAISE NOTICE '📦 重量範囲: 0.1kg - 25kg';
    RAISE NOTICE '🚚 配送日数: 6-15営業日 (SpeedPAK)';
END $$;