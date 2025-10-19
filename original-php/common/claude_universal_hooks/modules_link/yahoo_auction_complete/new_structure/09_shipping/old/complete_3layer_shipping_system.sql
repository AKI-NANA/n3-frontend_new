-- 完全版配送システム（3層構造）データベース設計
-- レイヤー: 配送会社 → 配送業者 → サービス → 料金

\echo '=== 完全版3層構造配送システム構築 ==='

-- 既存テーブルの拡張
DROP TABLE IF EXISTS shipping_services CASCADE;
DROP TABLE IF EXISTS shipping_service_rates CASCADE;

-- 配送業者・サービス詳細テーブル
CREATE TABLE shipping_services (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(20) NOT NULL, -- 'ELOGI', 'CPASS', 'JPPOST'
    carrier_code VARCHAR(20) NOT NULL, -- 'UPS', 'DHL', 'FEDEX', 'EMS', 'SPEEDPAK'
    service_code VARCHAR(50) NOT NULL, -- 'UPS_EXPRESS', 'DHL_EXPRESS_WORLDWIDE'
    service_name VARCHAR(100) NOT NULL,
    service_name_ja VARCHAR(100) NOT NULL,
    
    -- サービス特性
    service_type VARCHAR(20), -- 'EXPRESS', 'STANDARD', 'ECONOMY'
    delivery_speed INTEGER, -- 1(最速) ~ 5(最遅)
    price_tier INTEGER, -- 1(最安) ~ 5(最高)
    
    -- 制約・特徴
    max_weight_kg DECIMAL(5,2),
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT TRUE,
    requires_signature BOOLEAN DEFAULT FALSE,
    
    -- ゾーン対応
    supported_zones TEXT[], -- ['Zone1', 'Zone2'] or ['第1地帯', '第2地帯']
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(company_code, carrier_code, service_code)
);

-- 詳細料金テーブル（サービス別）
CREATE TABLE shipping_service_rates (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(20) NOT NULL,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    
    -- 追加料金
    fuel_surcharge_rate DECIMAL(5,2) DEFAULT 0,
    remote_area_surcharge DECIMAL(8,2) DEFAULT 0,
    handling_fee DECIMAL(8,2) DEFAULT 0,
    
    effective_from DATE DEFAULT CURRENT_DATE,
    data_source VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (company_code, carrier_code, service_code) 
    REFERENCES shipping_services(company_code, carrier_code, service_code),
    
    CHECK (weight_from_g <= weight_to_g),
    CHECK (price_jpy >= 0)
);

-- 国別ゾーン情報（拡張版）
CREATE TABLE country_zones_extended (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(5) NOT NULL,
    country_name_en VARCHAR(100) NOT NULL,
    country_name_ja VARCHAR(100) NOT NULL,
    country_flag VARCHAR(10),
    
    -- 各社のゾーン情報
    elogi_zone VARCHAR(20),
    elogi_supported BOOLEAN DEFAULT FALSE,
    
    cpass_zone VARCHAR(20),
    cpass_supported BOOLEAN DEFAULT FALSE,
    
    jppost_zone VARCHAR(20),
    jppost_supported BOOLEAN DEFAULT TRUE,
    
    -- 地理情報
    region VARCHAR(50),
    is_major_market BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(country_code)
);

-- =============================================================================
-- eLogi サービス投入
-- =============================================================================

-- UPS サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('ELOGI', 'UPS', 'UPS_EXPRESS', 'UPS Express', 'UPS エクスプレス', 'EXPRESS', 1, 4, 70.0, ARRAY['Zone1', 'Zone2', 'Zone3']),
('ELOGI', 'UPS', 'UPS_STANDARD', 'UPS Standard', 'UPS スタンダード', 'STANDARD', 3, 3, 70.0, ARRAY['Zone1', 'Zone2', 'Zone3']),
('ELOGI', 'UPS', 'UPS_EXPEDITED', 'UPS Expedited', 'UPS エクスペディテッド', 'STANDARD', 2, 3, 70.0, ARRAY['Zone1', 'Zone2']),
('ELOGI', 'UPS', 'UPS_SAVER', 'UPS Saver', 'UPS セーバー', 'ECONOMY', 4, 2, 70.0, ARRAY['Zone1', 'Zone2']);

-- DHL サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('ELOGI', 'DHL', 'DHL_EXPRESS_WORLDWIDE', 'DHL Express Worldwide', 'DHL エクスプレス ワールドワイド', 'EXPRESS', 1, 5, 70.0, ARRAY['Zone1', 'Zone2', 'Zone3']),
('ELOGI', 'DHL', 'DHL_EXPRESS_1200', 'DHL Express 12:00', 'DHL エクスプレス 12:00', 'EXPRESS', 1, 5, 70.0, ARRAY['Zone1']),
('ELOGI', 'DHL', 'DHL_EXPRESS_0900', 'DHL Express 9:00', 'DHL エクスプレス 9:00', 'EXPRESS', 1, 5, 70.0, ARRAY['Zone1']),
('ELOGI', 'DHL', 'DHL_ECONOMY', 'DHL Economy', 'DHL エコノミー', 'ECONOMY', 4, 2, 70.0, ARRAY['Zone2', 'Zone3']);

-- FedEx サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('ELOGI', 'FEDEX', 'FEDEX_INTL_PRIORITY', 'FedEx International Priority', 'FedEx インターナショナル プライオリティ', 'EXPRESS', 1, 4, 70.0, ARRAY['Zone1', 'Zone2', 'Zone3']),
('ELOGI', 'FEDEX', 'FEDEX_INTL_ECONOMY', 'FedEx International Economy', 'FedEx インターナショナル エコノミー', 'ECONOMY', 3, 3, 70.0, ARRAY['Zone1', 'Zone2', 'Zone3']),
('ELOGI', 'FEDEX', 'FEDEX_EXPRESS_SAVER', 'FedEx Express Saver', 'FedEx エクスプレス セーバー', 'STANDARD', 2, 3, 70.0, ARRAY['Zone1', 'Zone2']);

-- =============================================================================
-- CPass サービス投入
-- =============================================================================

-- DHL サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('CPASS', 'DHL', 'DHL_ECOMMERCE', 'DHL eCommerce', 'DHL eコマース', 'ECONOMY', 4, 2, 30.0, ARRAY['USA対応', 'UK対応', 'DE対応', 'AU対応']),
('CPASS', 'DHL', 'DHL_PACKET', 'DHL Packet', 'DHL パケット', 'ECONOMY', 5, 1, 2.0, ARRAY['USA対応', 'UK対応', 'DE対応']);

-- FedEx サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('CPASS', 'FEDEX', 'FEDEX_SMARTPOST', 'FedEx SmartPost', 'FedEx スマートポスト', 'ECONOMY', 4, 2, 30.0, ARRAY['USA対応']),
('CPASS', 'FEDEX', 'FEDEX_GROUND', 'FedEx Ground', 'FedEx グラウンド', 'STANDARD', 3, 2, 30.0, ARRAY['USA対応']);

-- SpeedPAK サービス
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('CPASS', 'SPEEDPAK', 'SPEEDPAK_ECONOMY', 'SpeedPAK Economy', 'スピードパック エコノミー', 'ECONOMY', 4, 1, 30.0, ARRAY['USA対応', 'UK対応', 'DE対応', 'AU対応']),
('CPASS', 'SPEEDPAK', 'SPEEDPAK_STANDARD', 'SpeedPAK Standard', 'スピードパック スタンダード', 'STANDARD', 3, 2, 30.0, ARRAY['USA対応', 'UK対応', 'DE対応']),
('CPASS', 'SPEEDPAK', 'SPEEDPAK_PLUS', 'SpeedPAK Plus', 'スピードパック プラス', 'STANDARD', 2, 3, 30.0, ARRAY['USA対応', 'UK対応']);

-- =============================================================================
-- 日本郵便サービス投入
-- =============================================================================

-- EMS
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('JPPOST', 'EMS', 'EMS', 'EMS', 'EMS（国際スピード郵便）', 'EXPRESS', 2, 3, 30.0, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']);

-- 小型包装物
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('JPPOST', 'PARCEL', 'PARCEL_AIRMAIL', 'Small Packet Airmail', '小型包装物（航空便）', 'STANDARD', 3, 2, 2.0, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']),
('JPPOST', 'PARCEL', 'PARCEL_SAL', 'Small Packet SAL', '小型包装物（SAL便）', 'ECONOMY', 4, 1, 2.0, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']),
('JPPOST', 'PARCEL', 'PARCEL_SURFACE', 'Small Packet Surface', '小型包装物（船便）', 'ECONOMY', 5, 1, 2.0, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']);

-- 書状書留
INSERT INTO shipping_services (company_code, carrier_code, service_code, service_name, service_name_ja, service_type, delivery_speed, price_tier, max_weight_kg, supported_zones) VALUES
('JPPOST', 'LETTER', 'LETTER_AIRMAIL', 'Airmail Letter', '航空書状', 'STANDARD', 3, 1, 0.05, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']),
('JPPOST', 'LETTER', 'LETTER_AEROGRAM', 'Aerogram', 'エアログラム', 'STANDARD', 3, 1, 0.05, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']),
('JPPOST', 'LETTER', 'LETTER_REGISTERED', 'International Recorded', '国際特定記録', 'STANDARD', 3, 2, 0.05, ARRAY['第1地帯', '第2地帯', '第3地帯', '第4地帯', '第5地帯']);

-- =============================================================================
-- 拡張国情報投入
-- =============================================================================

INSERT INTO country_zones_extended (country_code, country_name_en, country_name_ja, country_flag, elogi_zone, elogi_supported, cpass_zone, cpass_supported, jppost_zone, jppost_supported, region, is_major_market) VALUES
-- 主要国
('US', 'United States', 'アメリカ', '🇺🇸', 'Zone1', TRUE, 'USA対応', TRUE, '第4地帯', TRUE, 'North America', TRUE),
('GB', 'United Kingdom', 'イギリス', '🇬🇧', 'Zone2', TRUE, 'UK対応', TRUE, '第3地帯', TRUE, 'Europe', TRUE),
('DE', 'Germany', 'ドイツ', '🇩🇪', 'Zone2', TRUE, 'DE対応', TRUE, '第3地帯', TRUE, 'Europe', TRUE),
('SG', 'Singapore', 'シンガポール', '🇸🇬', 'Zone1', TRUE, '対応外', FALSE, '第2地帯', TRUE, 'Asia', TRUE),
('HK', 'Hong Kong', '香港', '🇭🇰', 'Zone1', TRUE, '対応外', FALSE, '第2地帯', TRUE, 'Asia', TRUE),
('AU', 'Australia', 'オーストラリア', '🇦🇺', 'Zone3', TRUE, 'AU対応', TRUE, '第3地帯', TRUE, 'Oceania', TRUE),
('CA', 'Canada', 'カナダ', '🇨🇦', 'Zone2', TRUE, '対応外', FALSE, '第3地帯', TRUE, 'North America', TRUE),
('MX', 'Mexico', 'メキシコ', '🇲🇽', 'Zone3', TRUE, '対応外', FALSE, '第5地帯', TRUE, 'North America', FALSE),
('IL', 'Israel', 'イスラエル', '🇮🇱', 'Zone3', TRUE, '対応外', FALSE, '第3地帯', TRUE, 'Middle East', FALSE),
('IT', 'Italy', 'イタリア', '🇮🇹', 'Zone2', TRUE, '対応外', FALSE, '第3地帯', TRUE, 'Europe', TRUE),
('CH', 'Switzerland', 'スイス', '🇨🇭', 'Zone2', TRUE, '対応外', FALSE, '第3地帯', TRUE, 'Europe', FALSE);

-- インデックス作成
CREATE INDEX idx_shipping_services_company ON shipping_services(company_code, carrier_code);
CREATE INDEX idx_shipping_service_rates_lookup ON shipping_service_rates(company_code, carrier_code, service_code, country_code);
CREATE INDEX idx_country_zones_extended_country ON country_zones_extended(country_code);

-- =============================================================================
-- 検索関数
-- =============================================================================

-- 国別利用可能サービス取得関数
CREATE OR REPLACE FUNCTION get_country_services(p_country_code VARCHAR(5))
RETURNS TABLE (
    company_code VARCHAR(20),
    carrier_code VARCHAR(20),
    service_code VARCHAR(50),
    service_name_ja VARCHAR(100),
    service_type VARCHAR(20),
    zone_code VARCHAR(20),
    is_supported BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.company_code,
        ss.carrier_code,
        ss.service_code,
        ss.service_name_ja,
        ss.service_type,
        CASE 
            WHEN ss.company_code = 'ELOGI' THEN cze.elogi_zone
            WHEN ss.company_code = 'CPASS' THEN cze.cpass_zone
            WHEN ss.company_code = 'JPPOST' THEN cze.jppost_zone
        END as zone_code,
        CASE 
            WHEN ss.company_code = 'ELOGI' THEN cze.elogi_supported
            WHEN ss.company_code = 'CPASS' THEN cze.cpass_supported
            WHEN ss.company_code = 'JPPOST' THEN cze.jppost_supported
        END as is_supported
    FROM shipping_services ss
    CROSS JOIN country_zones_extended cze
    WHERE cze.country_code = p_country_code
      AND ss.is_active = TRUE
      AND (
          (ss.company_code = 'ELOGI' AND cze.elogi_supported = TRUE AND cze.elogi_zone = ANY(ss.supported_zones)) OR
          (ss.company_code = 'CPASS' AND cze.cpass_supported = TRUE AND cze.cpass_zone = ANY(ss.supported_zones)) OR
          (ss.company_code = 'JPPOST' AND cze.jppost_supported = TRUE AND cze.jppost_zone = ANY(ss.supported_zones))
      )
    ORDER BY ss.company_code, ss.carrier_code, ss.delivery_speed;
END;
$$ LANGUAGE plpgsql;

-- 動作確認
SELECT '=== アメリカ向け利用可能サービス ===' as test;
SELECT * FROM get_country_services('US') LIMIT 10;

SELECT '=== システム統計 ===' as test;
SELECT 
    'サービス数' as metric, COUNT(*) as value FROM shipping_services
UNION ALL
SELECT 
    '対応国数' as metric, COUNT(*) as value FROM country_zones_extended;

SELECT '✅ 完全版3層構造配送システム構築完了' as result;