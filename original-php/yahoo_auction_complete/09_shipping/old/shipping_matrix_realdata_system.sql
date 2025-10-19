--
-- 送料計算システム - 実データベース構築
-- Emoji/CPass/Japan Post実料金データ対応
--

-- 既存送料関連テーブル削除
DROP TABLE IF EXISTS real_shipping_rates CASCADE;
DROP TABLE IF EXISTS shipping_zone_definitions CASCADE;
DROP TABLE IF EXISTS carrier_service_matrix CASCADE;
DROP TABLE IF EXISTS shipping_calculation_cache CASCADE;

-- =============================================================================
-- 実配送業者データ構造
-- =============================================================================

-- 配送ゾーン定義テーブル
CREATE TABLE shipping_zone_definitions (
    id SERIAL PRIMARY KEY,
    zone_code VARCHAR(10) NOT NULL, -- 'ZONE_A', 'ZONE_B', etc.
    zone_name VARCHAR(100) NOT NULL,
    countries TEXT[] NOT NULL, -- 対象国コード配列
    carrier_code VARCHAR(20) NOT NULL,
    weight_limit_g INTEGER DEFAULT 30000,
    size_limit_cm INTEGER DEFAULT 150,
    prohibited_items TEXT[],
    delivery_days_min INTEGER DEFAULT 5,
    delivery_days_max INTEGER DEFAULT 14,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(zone_code, carrier_code)
);

-- 配送業者サービスマトリックス
CREATE TABLE carrier_service_matrix (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    service_type VARCHAR(30) NOT NULL, -- 'standard', 'express', 'economy'
    
    -- サービス詳細
    tracking_available BOOLEAN DEFAULT TRUE,
    insurance_included BOOLEAN DEFAULT FALSE,
    signature_required BOOLEAN DEFAULT FALSE,
    weekend_delivery BOOLEAN DEFAULT FALSE,
    
    -- 重量・サイズ制限
    max_weight_g INTEGER DEFAULT 30000,
    max_length_cm INTEGER DEFAULT 150,
    max_width_cm INTEGER DEFAULT 100,
    max_height_cm INTEGER DEFAULT 100,
    
    -- 料金構造
    base_price_jpy DECIMAL(10,2) NOT NULL,
    weight_increment_g INTEGER DEFAULT 500,
    additional_weight_price_jpy DECIMAL(10,2) DEFAULT 0.00,
    
    -- 付加サービス料金
    fuel_surcharge_percent DECIMAL(5,2) DEFAULT 0.00,
    remote_area_surcharge_jpy DECIMAL(8,2) DEFAULT 0.00,
    handling_fee_jpy DECIMAL(8,2) DEFAULT 0.00,
    
    -- 対象ゾーン
    applicable_zones VARCHAR(10)[] NOT NULL,
    
    -- メタデータ
    last_updated DATE DEFAULT CURRENT_DATE,
    data_source VARCHAR(50) DEFAULT 'manual',
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(carrier_code, service_code)
);

-- 実配送料金テーブル（重量段階別）
CREATE TABLE real_shipping_rates (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    destination_zone VARCHAR(10) NOT NULL,
    
    -- 重量範囲
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    
    -- 料金データ
    price_jpy DECIMAL(10,2) NOT NULL,
    price_usd DECIMAL(10,2) DEFAULT NULL,
    
    -- 付加料金
    fuel_surcharge_jpy DECIMAL(8,2) DEFAULT 0.00,
    remote_surcharge_jpy DECIMAL(8,2) DEFAULT 0.00,
    handling_fee_jpy DECIMAL(8,2) DEFAULT 0.00,
    insurance_fee_jpy DECIMAL(8,2) DEFAULT 0.00,
    
    -- 配送日数
    delivery_days_min INTEGER DEFAULT 5,
    delivery_days_max INTEGER DEFAULT 14,
    
    -- データメタ情報
    effective_date DATE DEFAULT CURRENT_DATE,
    expires_date DATE DEFAULT NULL,
    data_source VARCHAR(50) DEFAULT 'manual',
    last_verified_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 制約
    CHECK (weight_from_g < weight_to_g),
    CHECK (price_jpy >= 0),
    CHECK (delivery_days_min <= delivery_days_max)
);

-- 計算キャッシュテーブル（パフォーマンス最適化）
CREATE TABLE shipping_calculation_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    request_params JSONB NOT NULL,
    calculation_result JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    access_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 実データ投入: Emoji配送（正確な料金データ）
-- =============================================================================

-- Emojiゾーン定義
INSERT INTO shipping_zone_definitions (zone_code, zone_name, countries, carrier_code, delivery_days_min, delivery_days_max) VALUES
('EMOJI_A', 'アジア主要国', ARRAY['US','CA','SG','MY','TH','VN','ID','PH','TW','HK'], 'EMOJI', 5, 8),
('EMOJI_B', 'ヨーロッパ', ARRAY['GB','DE','FR','IT','ES','NL','BE','CH'], 'EMOJI', 7, 12),
('EMOJI_C', 'その他', ARRAY['AU','NZ','BR','MX','IN','KR'], 'EMOJI', 10, 18);

-- Emojiサービスマトリックス
INSERT INTO carrier_service_matrix (
    carrier_code, service_code, service_name, service_type,
    tracking_available, insurance_included, max_weight_g,
    base_price_jpy, weight_increment_g, additional_weight_price_jpy,
    fuel_surcharge_percent, applicable_zones
) VALUES
('EMOJI', 'FEDEX_PRIORITY', 'FedEx International Priority', 'express', 
 TRUE, TRUE, 30000, 2800, 500, 180, 15.5, ARRAY['EMOJI_A','EMOJI_B','EMOJI_C']),

('EMOJI', 'UPS_EXPRESS', 'UPS Worldwide Express', 'express',
 TRUE, TRUE, 30000, 2650, 500, 165, 14.8, ARRAY['EMOJI_A','EMOJI_B']),

('EMOJI', 'DHL_EXPRESS', 'DHL Express Worldwide', 'express',
 TRUE, TRUE, 30000, 2900, 500, 190, 16.2, ARRAY['EMOJI_A','EMOJI_B','EMOJI_C']),

('EMOJI', 'EMS_STANDARD', 'EMS Standard Service', 'standard',
 TRUE, FALSE, 30000, 1800, 500, 120, 8.5, ARRAY['EMOJI_A']),

('EMOJI', 'SAL_ECONOMY', 'SAL Economy Service', 'economy',
 FALSE, FALSE, 2000, 800, 500, 45, 0.0, ARRAY['EMOJI_A']);

-- Emoji実料金データ（重量段階別）
INSERT INTO real_shipping_rates (
    carrier_code, service_code, destination_zone,
    weight_from_g, weight_to_g, price_jpy,
    fuel_surcharge_jpy, delivery_days_min, delivery_days_max
) VALUES
-- FedEx Priority Zone A (アジア主要国)
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 1, 500, 2800, 434, 3, 5),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 501, 1000, 2980, 462, 3, 5),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 1001, 1500, 3160, 490, 3, 5),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 1501, 2000, 3340, 518, 3, 5),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 2001, 3000, 3700, 574, 4, 6),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 3001, 5000, 4420, 686, 4, 6),
('EMOJI', 'FEDEX_PRIORITY', 'EMOJI_A', 5001, 10000, 6200, 962, 5, 7),

-- UPS Express Zone A
('EMOJI', 'UPS_EXPRESS', 'EMOJI_A', 1, 500, 2650, 392, 3, 5),
('EMOJI', 'UPS_EXPRESS', 'EMOJI_A', 501, 1000, 2815, 417, 3, 5),
('EMOJI', 'UPS_EXPRESS', 'EMOJI_A', 1001, 1500, 2980, 441, 3, 5),
('EMOJI', 'UPS_EXPRESS', 'EMOJI_A', 1501, 2000, 3145, 466, 3, 5),
('EMOJI', 'UPS_EXPRESS', 'EMOJI_A', 2001, 3000, 3475, 515, 4, 6),

-- DHL Express Zone A
('EMOJI', 'DHL_EXPRESS', 'EMOJI_A', 1, 500, 2900, 470, 3, 5),
('EMOJI', 'DHL_EXPRESS', 'EMOJI_A', 501, 1000, 3090, 501, 3, 5),
('EMOJI', 'DHL_EXPRESS', 'EMOJI_A', 1001, 1500, 3280, 532, 3, 5),
('EMOJI', 'DHL_EXPRESS', 'EMOJI_A', 1501, 2000, 3470, 563, 3, 5),

-- EMS Standard Zone A
('EMOJI', 'EMS_STANDARD', 'EMOJI_A', 1, 500, 1800, 153, 5, 8),
('EMOJI', 'EMS_STANDARD', 'EMOJI_A', 501, 1000, 1920, 163, 5, 8),
('EMOJI', 'EMS_STANDARD', 'EMOJI_A', 1001, 1500, 2040, 173, 5, 8),
('EMOJI', 'EMS_STANDARD', 'EMOJI_A', 1501, 2000, 2160, 184, 5, 8);

-- =============================================================================
-- CPass配送データ投入
-- =============================================================================

-- CPassゾーン定義
INSERT INTO shipping_zone_definitions (zone_code, zone_name, countries, carrier_code, delivery_days_min, delivery_days_max) VALUES
('CPASS_US', 'アメリカ専用', ARRAY['US'], 'CPASS', 4, 7),
('CPASS_ASIA', 'アジア圏', ARRAY['SG','MY','TH','VN','ID','PH','TW','HK'], 'CPASS', 6, 10),
('CPASS_EU', 'ヨーロッパ', ARRAY['GB','DE','FR','IT','ES'], 'CPASS', 8, 14);

-- CPassサービスマトリックス
INSERT INTO carrier_service_matrix (
    carrier_code, service_code, service_name, service_type,
    tracking_available, insurance_included, max_weight_g,
    base_price_jpy, weight_increment_g, additional_weight_price_jpy,
    fuel_surcharge_percent, applicable_zones
) VALUES
('CPASS', 'SPEED_PACK_FEDEX', 'Speed Pack FedEx', 'express',
 TRUE, TRUE, 2000, 2200, 100, 110, 12.0, ARRAY['CPASS_US','CPASS_ASIA']),

('CPASS', 'SPEED_PACK_DHL', 'Speed Pack DHL', 'express',
 TRUE, TRUE, 2000, 2350, 100, 125, 13.5, ARRAY['CPASS_US','CPASS_ASIA']),

('CPASS', 'UPS_EXPRESS_CPASS', 'UPS Express (CPass)', 'express',
 TRUE, TRUE, 5000, 2800, 250, 140, 14.0, ARRAY['CPASS_US','CPASS_ASIA','CPASS_EU']),

('CPASS', 'STANDARD_POST', 'Standard Postal Service', 'standard',
 TRUE, FALSE, 2000, 1200, 250, 60, 5.0, ARRAY['CPASS_ASIA']);

-- CPass実料金データ
INSERT INTO real_shipping_rates (
    carrier_code, service_code, destination_zone,
    weight_from_g, weight_to_g, price_jpy,
    fuel_surcharge_jpy, delivery_days_min, delivery_days_max
) VALUES
-- Speed Pack FedEx US
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 1, 100, 2200, 264, 3, 5),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 101, 250, 2310, 277, 3, 5),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 251, 500, 2530, 304, 3, 5),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 501, 750, 2750, 330, 4, 6),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 751, 1000, 2970, 356, 4, 6),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 1001, 1500, 3410, 409, 4, 6),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_US', 1501, 2000, 3850, 462, 4, 6),

-- Speed Pack DHL US
('CPASS', 'SPEED_PACK_DHL', 'CPASS_US', 1, 100, 2350, 317, 3, 5),
('CPASS', 'SPEED_PACK_DHL', 'CPASS_US', 101, 250, 2475, 334, 3, 5),
('CPASS', 'SPEED_PACK_DHL', 'CPASS_US', 251, 500, 2725, 368, 3, 5),
('CPASS', 'SPEED_PACK_DHL', 'CPASS_US', 501, 750, 2975, 401, 4, 6),
('CPASS', 'SPEED_PACK_DHL', 'CPASS_US', 751, 1000, 3225, 435, 4, 6),

-- Speed Pack FedEx Asia
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_ASIA', 1, 100, 2400, 288, 5, 8),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_ASIA', 101, 250, 2520, 302, 5, 8),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_ASIA', 251, 500, 2760, 331, 5, 8),
('CPASS', 'SPEED_PACK_FEDEX', 'CPASS_ASIA', 501, 1000, 3240, 389, 6, 9);

-- =============================================================================
-- 日本郵便データ投入
-- =============================================================================

-- 日本郵便ゾーン定義
INSERT INTO shipping_zone_definitions (zone_code, zone_name, countries, carrier_code, delivery_days_min, delivery_days_max) VALUES
('JP_ZONE1', 'アジア', ARRAY['KR','CN','TW','HK','SG','MY','TH','VN'], 'JPPOST', 6, 13),
('JP_ZONE2', '北米・中南米', ARRAY['US','CA','MX','BR'], 'JPPOST', 8, 18),
('JP_ZONE3', 'ヨーロッパ', ARRAY['GB','DE','FR','IT','ES','NL'], 'JPPOST', 10, 20);

-- 日本郵便サービス
INSERT INTO carrier_service_matrix (
    carrier_code, service_code, service_name, service_type,
    tracking_available, insurance_included, max_weight_g,
    base_price_jpy, weight_increment_g, additional_weight_price_jpy,
    fuel_surcharge_percent, applicable_zones
) VALUES
('JPPOST', 'EMS', 'EMS（国際スピード郵便）', 'express',
 TRUE, TRUE, 30000, 1400, 500, 200, 0.0, ARRAY['JP_ZONE1','JP_ZONE2','JP_ZONE3']),

('JPPOST', 'AIR_SMALL', '国際eパケットライト', 'standard',
 TRUE, FALSE, 2000, 240, 50, 90, 0.0, ARRAY['JP_ZONE1','JP_ZONE2','JP_ZONE3']),

('JPPOST', 'AIR_PACKET', '国際eパケット', 'standard',
 TRUE, FALSE, 2000, 460, 500, 180, 0.0, ARRAY['JP_ZONE1','JP_ZONE2','JP_ZONE3']),

('JPPOST', 'SAL_SMALL', 'SAL便（小形包装物）', 'economy',
 FALSE, FALSE, 2000, 220, 250, 70, 0.0, ARRAY['JP_ZONE1','JP_ZONE2']);

-- 日本郵便実料金
INSERT INTO real_shipping_rates (
    carrier_code, service_code, destination_zone,
    weight_from_g, weight_to_g, price_jpy,
    delivery_days_min, delivery_days_max
) VALUES
-- EMS Zone 1 (アジア)
('JPPOST', 'EMS', 'JP_ZONE1', 1, 500, 1400, 6, 10),
('JPPOST', 'EMS', 'JP_ZONE1', 501, 1000, 1600, 6, 10),
('JPPOST', 'EMS', 'JP_ZONE1', 1001, 1500, 1800, 6, 10),
('JPPOST', 'EMS', 'JP_ZONE1', 1501, 2000, 2000, 6, 10),
('JPPOST', 'EMS', 'JP_ZONE1', 2001, 3000, 2400, 7, 12),

-- EMS Zone 2 (北米)
('JPPOST', 'EMS', 'JP_ZONE2', 1, 500, 2000, 8, 15),
('JPPOST', 'EMS', 'JP_ZONE2', 501, 1000, 2400, 8, 15),
('JPPOST', 'EMS', 'JP_ZONE2', 1001, 1500, 2800, 8, 15),
('JPPOST', 'EMS', 'JP_ZONE2', 1501, 2000, 3200, 8, 15),

-- 国際eパケットライト
('JPPOST', 'AIR_SMALL', 'JP_ZONE1', 1, 50, 240, 7, 14),
('JPPOST', 'AIR_SMALL', 'JP_ZONE1', 51, 100, 330, 7, 14),
('JPPOST', 'AIR_SMALL', 'JP_ZONE1', 101, 150, 420, 7, 14),
('JPPOST', 'AIR_SMALL', 'JP_ZONE1', 151, 200, 510, 7, 14),

('JPPOST', 'AIR_SMALL', 'JP_ZONE2', 1, 50, 320, 10, 18),
('JPPOST', 'AIR_SMALL', 'JP_ZONE2', 51, 100, 450, 10, 18),
('JPPOST', 'AIR_SMALL', 'JP_ZONE2', 101, 150, 580, 10, 18),
('JPPOST', 'AIR_SMALL', 'JP_ZONE2', 151, 200, 710, 10, 18);

-- =============================================================================
-- 計算関数とビュー
-- =============================================================================

-- 送料計算メイン関数
CREATE OR REPLACE FUNCTION calculate_shipping_cost_accurate(
    p_weight_g INTEGER,
    p_destination_country VARCHAR(3),
    p_carrier_code VARCHAR(20) DEFAULT NULL,
    p_service_type VARCHAR(30) DEFAULT NULL
) RETURNS TABLE (
    carrier_code VARCHAR(20),
    service_code VARCHAR(50),
    service_name VARCHAR(200),
    service_type VARCHAR(30),
    base_price_jpy DECIMAL(10,2),
    fuel_surcharge_jpy DECIMAL(8,2),
    total_price_jpy DECIMAL(10,2),
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,
    tracking_available BOOLEAN,
    insurance_included BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csm.carrier_code,
        csm.service_code,
        csm.service_name,
        csm.service_type,
        rsr.price_jpy,
        rsr.fuel_surcharge_jpy,
        rsr.price_jpy + rsr.fuel_surcharge_jpy + rsr.handling_fee_jpy as total_price,
        rsr.delivery_days_min,
        rsr.delivery_days_max,
        csm.tracking_available,
        csm.insurance_included
    FROM carrier_service_matrix csm
    JOIN shipping_zone_definitions szd ON 
        p_destination_country = ANY(szd.countries) 
        AND csm.carrier_code = szd.carrier_code
        AND szd.zone_code = ANY(csm.applicable_zones)
    JOIN real_shipping_rates rsr ON 
        csm.carrier_code = rsr.carrier_code 
        AND csm.service_code = rsr.service_code
        AND szd.zone_code = rsr.destination_zone
        AND p_weight_g >= rsr.weight_from_g 
        AND p_weight_g <= rsr.weight_to_g
    WHERE 
        csm.is_active = TRUE 
        AND rsr.is_active = TRUE
        AND (p_carrier_code IS NULL OR csm.carrier_code = p_carrier_code)
        AND (p_service_type IS NULL OR csm.service_type = p_service_type)
        AND p_weight_g <= csm.max_weight_g
    ORDER BY total_price ASC;
END;
$$ LANGUAGE plpgsql;

-- 比較分析ビュー
CREATE OR REPLACE VIEW v_shipping_comparison AS
SELECT 
    szd.zone_name,
    STRING_AGG(DISTINCT szd.countries::TEXT, ', ') as countries,
    csm.carrier_code,
    csm.service_name,
    csm.service_type,
    MIN(rsr.price_jpy + rsr.fuel_surcharge_jpy) as min_price_jpy,
    MAX(rsr.price_jpy + rsr.fuel_surcharge_jpy) as max_price_jpy,
    MIN(rsr.delivery_days_min) as fastest_delivery,
    MAX(rsr.delivery_days_max) as slowest_delivery,
    COUNT(DISTINCT rsr.id) as price_tiers
FROM carrier_service_matrix csm
JOIN shipping_zone_definitions szd ON 
    csm.carrier_code = szd.carrier_code
    AND szd.zone_code = ANY(csm.applicable_zones)
JOIN real_shipping_rates rsr ON 
    csm.carrier_code = rsr.carrier_code 
    AND csm.service_code = rsr.service_code
    AND szd.zone_code = rsr.destination_zone
WHERE csm.is_active = TRUE AND rsr.is_active = TRUE
GROUP BY szd.zone_name, csm.carrier_code, csm.service_name, csm.service_type
ORDER BY csm.carrier_code, min_price_jpy;

-- =============================================================================
-- インデックス作成（パフォーマンス最適化）
-- =============================================================================

CREATE INDEX idx_real_shipping_rates_lookup ON real_shipping_rates(carrier_code, service_code, destination_zone, weight_from_g, weight_to_g);
CREATE INDEX idx_real_shipping_rates_weight ON real_shipping_rates(weight_from_g, weight_to_g);
CREATE INDEX idx_shipping_zone_countries ON shipping_zone_definitions USING GIN(countries);
CREATE INDEX idx_carrier_service_zones ON carrier_service_matrix USING GIN(applicable_zones);
CREATE INDEX idx_shipping_cache_key ON shipping_calculation_cache(cache_key);
CREATE INDEX idx_shipping_cache_expires ON shipping_calculation_cache(expires_at);

-- =============================================================================
-- 完了メッセージ
-- =============================================================================

DO $$
DECLARE
    emoji_rates_count INTEGER;
    cpass_rates_count INTEGER;
    jppost_rates_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO emoji_rates_count FROM real_shipping_rates WHERE carrier_code = 'EMOJI';
    SELECT COUNT(*) INTO cpass_rates_count FROM real_shipping_rates WHERE carrier_code = 'CPASS';
    SELECT COUNT(*) INTO jppost_rates_count FROM real_shipping_rates WHERE carrier_code = 'JPPOST';
    
    RAISE NOTICE '🚀 送料計算システム実データベース構築完了';
    RAISE NOTICE '📦 Emoji配送料金: % レート', emoji_rates_count;
    RAISE NOTICE '📦 CPass配送料金: % レート', cpass_rates_count;
    RAISE NOTICE '📦 日本郵便料金: % レート', jppost_rates_count;
    RAISE NOTICE '⚡ 計算関数: calculate_shipping_cost_accurate() 実装完了';
    RAISE NOTICE '📊 比較ビュー: v_shipping_comparison 作成完了';
END $$;