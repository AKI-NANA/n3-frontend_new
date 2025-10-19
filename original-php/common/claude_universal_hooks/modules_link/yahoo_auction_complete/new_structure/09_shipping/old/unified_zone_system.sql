-- 配送会社別ゾーン体系統一化データベース設計
-- 解決策: 国ベース + 配送会社別ゾーン管理

\echo '=== 配送会社別ゾーン体系統一化 データベース設計 ==='

-- 1. 国マスターテーブル（ISO標準）
DROP TABLE IF EXISTS countries CASCADE;
CREATE TABLE countries (
    country_code VARCHAR(5) PRIMARY KEY,
    country_name_en VARCHAR(100) NOT NULL,
    country_name_ja VARCHAR(100) NOT NULL,
    region VARCHAR(50), -- Asia, Europe, North America, etc.
    is_major_market BOOLEAN DEFAULT FALSE, -- 主要市場フラグ
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 配送会社・サービスマスター
DROP TABLE IF EXISTS carriers_services CASCADE;
CREATE TABLE carriers_services (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    carrier_name VARCHAR(100) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    zone_system_type VARCHAR(50), -- 'GEOGRAPHIC', 'COUNTRY_SPECIFIC', 'SERVICE_TIER'
    max_weight_kg DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(carrier_code, service_code)
);

-- 3. 配送可能性・ゾーンマッピング（核心テーブル）
DROP TABLE IF EXISTS shipping_zones CASCADE;
CREATE TABLE shipping_zones (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    
    -- 各配送会社の独自ゾーン表記
    original_zone_name VARCHAR(50), -- '第4地帯', 'USA対応', 'Zone1'
    
    -- 統一化された情報
    zone_tier INTEGER, -- 1(最安) ~ 5(最高) の価格帯
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,
    
    -- 対応状況
    is_available BOOLEAN DEFAULT TRUE,
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT TRUE,
    
    -- DDP対応
    ddp_supported BOOLEAN DEFAULT FALSE,
    customs_handling VARCHAR(20), -- 'INCLUDED', 'SEPARATE', 'NOT_SUPPORTED'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (carrier_code, service_code) REFERENCES carriers_services(carrier_code, service_code),
    FOREIGN KEY (country_code) REFERENCES countries(country_code),
    
    UNIQUE(carrier_code, service_code, country_code)
);

-- 4. 配送料金テーブル（重量別）
DROP TABLE IF EXISTS shipping_rates CASCADE;
CREATE TABLE shipping_rates (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    
    -- DDP関連
    estimated_duty_rate DECIMAL(5,2) DEFAULT 0, -- 関税率%
    ddp_surcharge_jpy DECIMAL(8,2) DEFAULT 0, -- DDP追加料金
    
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    data_source VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (carrier_code, service_code, country_code) 
    REFERENCES shipping_zones(carrier_code, service_code, country_code),
    
    CHECK (weight_from_g <= weight_to_g),
    CHECK (price_jpy >= 0)
);

-- インデックス作成
CREATE INDEX idx_shipping_zones_country ON shipping_zones(country_code);
CREATE INDEX idx_shipping_zones_carrier ON shipping_zones(carrier_code, service_code);
CREATE INDEX idx_shipping_zones_tier ON shipping_zones(zone_tier);
CREATE INDEX idx_shipping_rates_weight ON shipping_rates(weight_from_g, weight_to_g);
CREATE INDEX idx_shipping_rates_lookup ON shipping_rates(carrier_code, service_code, country_code);

-- =============================================================================
-- サンプルデータ投入
-- =============================================================================

-- 国マスター
INSERT INTO countries (country_code, country_name_en, country_name_ja, region, is_major_market) VALUES
('US', 'United States', 'アメリカ合衆国', 'North America', TRUE),
('GB', 'United Kingdom', 'イギリス', 'Europe', TRUE),
('DE', 'Germany', 'ドイツ', 'Europe', TRUE),
('FR', 'France', 'フランス', 'Europe', TRUE),
('AU', 'Australia', 'オーストラリア', 'Oceania', TRUE),
('SG', 'Singapore', 'シンガポール', 'Asia', TRUE),
('HK', 'Hong Kong', '香港', 'Asia', TRUE),
('CA', 'Canada', 'カナダ', 'North America', TRUE),
('MX', 'Mexico', 'メキシコ', 'North America', FALSE),
('CN', 'China', '中国', 'Asia', TRUE),
('KR', 'South Korea', '韓国', 'Asia', TRUE),
('TW', 'Taiwan', '台湾', 'Asia', TRUE),
('BR', 'Brazil', 'ブラジル', 'South America', FALSE);

-- 配送会社・サービス
INSERT INTO carriers_services (carrier_code, carrier_name, service_code, service_name, zone_system_type, max_weight_kg) VALUES
('JPPOST', '日本郵便', 'EMS', 'EMS（国際スピード郵便）', 'GEOGRAPHIC', 30.0),
('CPASS', 'CPass', 'SPEEDPAK_US', 'SpeedPAK Economy USA', 'COUNTRY_SPECIFIC', 25.0),
('CPASS', 'CPass', 'SPEEDPAK_UK', 'SpeedPAK Economy UK', 'COUNTRY_SPECIFIC', 25.0),
('CPASS', 'CPass', 'SPEEDPAK_DE', 'SpeedPAK Economy DE', 'COUNTRY_SPECIFIC', 25.0),
('CPASS', 'CPass', 'SPEEDPAK_AU', 'SpeedPAK Economy AU', 'COUNTRY_SPECIFIC', 25.0),
('ELOGI', 'eLogi', 'DHL_EXPRESS', 'DHL Express', 'SERVICE_TIER', 70.0),
('ELOGI', 'eLogi', 'FEDEX_PRIORITY', 'FedEx Priority', 'SERVICE_TIER', 70.0),
('ELOGI', 'eLogi', 'UPS_EXPRESS', 'UPS Express', 'SERVICE_TIER', 70.0);

-- ゾーンマッピング（アメリカの例）
INSERT INTO shipping_zones (carrier_code, service_code, country_code, original_zone_name, zone_tier, delivery_days_min, delivery_days_max, ddp_supported) VALUES
-- アメリカ向け
('JPPOST', 'EMS', 'US', '第4地帯', 4, 3, 6, FALSE),
('CPASS', 'SPEEDPAK_US', 'US', 'USA対応', 2, 8, 12, TRUE),
('ELOGI', 'DHL_EXPRESS', 'US', 'Zone1', 1, 1, 3, TRUE),
('ELOGI', 'FEDEX_PRIORITY', 'US', 'Zone1', 1, 1, 3, TRUE),
('ELOGI', 'UPS_EXPRESS', 'US', 'Zone1', 1, 1, 3, TRUE),

-- イギリス向け
('JPPOST', 'EMS', 'GB', '第3地帯', 3, 3, 6, FALSE),
('CPASS', 'SPEEDPAK_UK', 'GB', 'UK対応', 2, 7, 10, TRUE),
('ELOGI', 'DHL_EXPRESS', 'GB', 'Zone2', 2, 1, 4, TRUE),
('ELOGI', 'FEDEX_PRIORITY', 'GB', 'Zone2', 2, 1, 4, TRUE),
('ELOGI', 'UPS_EXPRESS', 'GB', 'Zone2', 2, 1, 4, TRUE),

-- シンガポール向け（SpeedPAK対応外の例）
('JPPOST', 'EMS', 'SG', '第2地帯', 2, 3, 6, FALSE),
('ELOGI', 'DHL_EXPRESS', 'SG', 'Zone1', 1, 1, 3, TRUE);

-- 料金データ（アメリカ向けEMSの例）
INSERT INTO shipping_rates (carrier_code, service_code, country_code, weight_from_g, weight_to_g, price_jpy, estimated_duty_rate, data_source) VALUES
-- EMS アメリカ向け（第4地帯）
('JPPOST', 'EMS', 'US', 100, 500, 3900.00, 5.0, 'ems_official_2025'),
('JPPOST', 'EMS', 'US', 501, 600, 4180.00, 5.0, 'ems_official_2025'),
('JPPOST', 'EMS', 'US', 901, 1000, 5300.00, 5.0, 'ems_official_2025'),
('JPPOST', 'EMS', 'US', 1751, 2000, 7900.00, 5.0, 'ems_official_2025'),

-- SpeedPAK USA
('CPASS', 'SPEEDPAK_US', 'US', 500, 500, 2060.00, 0.0, 'cpass_speedpak_2025'),
('CPASS', 'SPEEDPAK_US', 'US', 1000, 1000, 3020.00, 0.0, 'cpass_speedpak_2025'),
('CPASS', 'SPEEDPAK_US', 'US', 2000, 2000, 5245.00, 0.0, 'cpass_speedpak_2025');

-- =============================================================================
-- 統一検索関数
-- =============================================================================

-- 国別配送オプション取得関数
CREATE OR REPLACE FUNCTION get_shipping_options(p_country_code VARCHAR(5))
RETURNS TABLE (
    carrier_name VARCHAR(100),
    service_name VARCHAR(100), 
    original_zone VARCHAR(50),
    zone_tier INTEGER,
    delivery_days VARCHAR(20),
    ddp_supported BOOLEAN,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.carrier_name,
        cs.service_name,
        sz.original_zone_name,
        sz.zone_tier,
        sz.delivery_days_min || '-' || sz.delivery_days_max || '日',
        sz.ddp_supported,
        sz.is_available
    FROM shipping_zones sz
    JOIN carriers_services cs ON sz.carrier_code = cs.carrier_code 
                            AND sz.service_code = cs.service_code
    WHERE sz.country_code = p_country_code
      AND sz.is_available = TRUE
      AND cs.is_active = TRUE
    ORDER BY sz.zone_tier ASC, sz.delivery_days_min ASC;
END;
$$ LANGUAGE plpgsql;

-- 料金検索関数
CREATE OR REPLACE FUNCTION get_shipping_price(
    p_carrier_code VARCHAR(20),
    p_service_code VARCHAR(50), 
    p_country_code VARCHAR(5),
    p_weight_g INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_price DECIMAL(10,2);
BEGIN
    SELECT price_jpy INTO v_price
    FROM shipping_rates
    WHERE carrier_code = p_carrier_code
      AND service_code = p_service_code
      AND country_code = p_country_code
      AND p_weight_g BETWEEN weight_from_g AND weight_to_g
    ORDER BY ABS(weight_from_g - p_weight_g) ASC
    LIMIT 1;
    
    RETURN COALESCE(v_price, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 動作確認
-- =============================================================================

\echo ''
\echo '=== アメリカ向け配送オプション確認 ==='
SELECT * FROM get_shipping_options('US');

\echo ''
\echo '=== 料金検索テスト（1kg = 1000g） ==='
SELECT 
    'EMS to US 1kg' as test,
    get_shipping_price('JPPOST', 'EMS', 'US', 1000) as price;

SELECT 
    'SpeedPAK to US 1kg' as test,
    get_shipping_price('CPASS', 'SPEEDPAK_US', 'US', 1000) as price;

\echo ''
\echo '=== データベース統計 ==='
SELECT 
    'Countries' as table_name, COUNT(*) as records FROM countries
UNION ALL
SELECT 
    'Carriers/Services' as table_name, COUNT(*) as records FROM carriers_services  
UNION ALL
SELECT 
    'Shipping Zones' as table_name, COUNT(*) as records FROM shipping_zones
UNION ALL
SELECT 
    'Shipping Rates' as table_name, COUNT(*) as records FROM shipping_rates;

\echo '=== 配送会社別ゾーン体系統一化 完了 ==='