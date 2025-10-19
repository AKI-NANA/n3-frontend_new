-- 配送会社別ゾーン体系完全分離データベース設計
-- 問題解決: 各社のゾーン体系をそれぞれ独立管理

\echo '=== 配送会社別ゾーン体系完全分離システム構築 ==='

-- 既存の混在データを一旦クリア
DROP TABLE IF EXISTS carrier_zone_definitions CASCADE;
DROP TABLE IF EXISTS carrier_country_zones CASCADE;
DROP TABLE IF EXISTS zone_visualization_data CASCADE;

-- 1. 配送会社別ゾーン定義マスター
CREATE TABLE carrier_zone_definitions (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    carrier_name VARCHAR(100) NOT NULL,
    zone_system_name VARCHAR(50) NOT NULL, -- 'ELOGI_SERVICE_ZONES', 'EMS_GEOGRAPHIC_ZONES', 'CPASS_COUNTRY_ZONES'
    zone_code VARCHAR(20) NOT NULL,
    zone_display_name VARCHAR(50) NOT NULL,
    zone_description TEXT,
    zone_color VARCHAR(10), -- UI表示用カラーコード
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(carrier_code, zone_code)
);

-- 2. 配送会社×国×ゾーンマッピング（核心テーブル）
CREATE TABLE carrier_country_zones (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    country_name_en VARCHAR(100) NOT NULL,
    country_name_ja VARCHAR(100) NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    zone_display_name VARCHAR(50) NOT NULL,
    
    -- サービス詳細
    is_supported BOOLEAN DEFAULT TRUE,
    service_level INTEGER, -- 1(最高) ~ 5(最低)
    estimated_delivery_days_min INTEGER,
    estimated_delivery_days_max INTEGER,
    
    -- 料金関連
    base_price_tier INTEGER, -- 1(最安) ~ 5(最高)
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT TRUE,
    
    -- メタデータ
    data_source VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (carrier_code, zone_code) REFERENCES carrier_zone_definitions(carrier_code, zone_code),
    UNIQUE(carrier_code, country_code)
);

-- 3. ゾーン可視化用サマリーテーブル
CREATE TABLE zone_visualization_data (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    zone_code VARCHAR(20) NOT NULL,
    country_count INTEGER DEFAULT 0,
    sample_countries TEXT[], -- 代表国リスト
    avg_delivery_days DECIMAL(3,1),
    price_tier_range VARCHAR(20), -- '1-3', '2-4'等
    coverage_description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(carrier_code, zone_code)
);

-- =============================================================================
-- eMoji（eLogi）ゾーン定義
-- =============================================================================

-- eMoji ゾーン定義
INSERT INTO carrier_zone_definitions (carrier_code, carrier_name, zone_system_name, zone_code, zone_display_name, zone_description, zone_color, sort_order) VALUES
('ELOGI', 'eMoji（eLogi統合）', 'ELOGI_SERVICE_ZONES', 'ZONE1', 'Zone 1', '最高速サービス（1-3日）・主要都市', '#FF6B6B', 1),
('ELOGI', 'eMoji（eLogi統合）', 'ELOGI_SERVICE_ZONES', 'ZONE2', 'Zone 2', '高速サービス（2-4日）・主要国', '#4ECDC4', 2),
('ELOGI', 'eMoji（eLogi統合）', 'ELOGI_SERVICE_ZONES', 'ZONE3', 'Zone 3', '標準サービス（3-6日）・その他地域', '#45B7D1', 3);

-- eMoji 国別ゾーン
INSERT INTO carrier_country_zones (carrier_code, country_code, country_name_en, country_name_ja, zone_code, zone_display_name, service_level, estimated_delivery_days_min, estimated_delivery_days_max, base_price_tier, data_source) VALUES
-- Zone 1: 最高速サービス
('ELOGI', 'US', 'United States', 'アメリカ合衆国', 'ZONE1', 'Zone 1', 1, 1, 3, 3, 'elogi_official'),
('ELOGI', 'SG', 'Singapore', 'シンガポール', 'ZONE1', 'Zone 1', 1, 1, 3, 3, 'elogi_official'),
('ELOGI', 'HK', 'Hong Kong', '香港', 'ZONE1', 'Zone 1', 1, 1, 3, 3, 'elogi_official'),
('ELOGI', 'KR', 'South Korea', '韓国', 'ZONE1', 'Zone 1', 1, 1, 3, 3, 'elogi_official'),

-- Zone 2: 高速サービス  
('ELOGI', 'GB', 'United Kingdom', 'イギリス', 'ZONE2', 'Zone 2', 2, 2, 4, 4, 'elogi_official'),
('ELOGI', 'DE', 'Germany', 'ドイツ', 'ZONE2', 'Zone 2', 2, 2, 4, 4, 'elogi_official'),
('ELOGI', 'FR', 'France', 'フランス', 'ZONE2', 'Zone 2', 2, 2, 4, 4, 'elogi_official'),
('ELOGI', 'CA', 'Canada', 'カナダ', 'ZONE2', 'Zone 2', 2, 2, 4, 4, 'elogi_official'),
('ELOGI', 'NL', 'Netherlands', 'オランダ', 'ZONE2', 'Zone 2', 2, 2, 4, 4, 'elogi_official'),

-- Zone 3: 標準サービス
('ELOGI', 'AU', 'Australia', 'オーストラリア', 'ZONE3', 'Zone 3', 3, 3, 6, 5, 'elogi_official'),
('ELOGI', 'BR', 'Brazil', 'ブラジル', 'ZONE3', 'Zone 3', 3, 3, 6, 5, 'elogi_official'),
('ELOGI', 'IN', 'India', 'インド', 'ZONE3', 'Zone 3', 3, 3, 6, 5, 'elogi_official'),
('ELOGI', 'MX', 'Mexico', 'メキシコ', 'ZONE3', 'Zone 3', 3, 3, 6, 5, 'elogi_official');

-- =============================================================================
-- 日本郵便EMS ゾーン定義
-- =============================================================================

-- EMS ゾーン定義
INSERT INTO carrier_zone_definitions (carrier_code, carrier_name, zone_system_name, zone_code, zone_display_name, zone_description, zone_color, sort_order) VALUES
('JPPOST', '日本郵便EMS', 'EMS_GEOGRAPHIC_ZONES', 'ZONE1', '第1地帯', '近隣アジア（中国・韓国・台湾）', '#FFE66D', 1),
('JPPOST', '日本郵便EMS', 'EMS_GEOGRAPHIC_ZONES', 'ZONE2', '第2地帯', 'アジア（第1地帯除く）', '#FF9F1C', 2),
('JPPOST', '日本郵便EMS', 'EMS_GEOGRAPHIC_ZONES', 'ZONE3', '第3地帯', 'オセアニア・カナダ・メキシコ・中近東・ヨーロッパ', '#2EC4B6', 3),
('JPPOST', '日本郵便EMS', 'EMS_GEOGRAPHIC_ZONES', 'ZONE4', '第4地帯', 'アメリカ合衆国', '#E71D36', 4),
('JPPOST', '日本郵便EMS', 'EMS_GEOGRAPHIC_ZONES', 'ZONE5', '第5地帯', '中南米・アフリカ', '#541388', 5);

-- EMS 国別ゾーン（主要国のみ）
INSERT INTO carrier_country_zones (carrier_code, country_code, country_name_en, country_name_ja, zone_code, zone_display_name, service_level, estimated_delivery_days_min, estimated_delivery_days_max, base_price_tier, data_source) VALUES
-- 第1地帯: 近隣アジア
('JPPOST', 'CN', 'China', '中国', 'ZONE1', '第1地帯', 3, 3, 6, 1, 'ems_official'),
('JPPOST', 'KR', 'South Korea', '韓国', 'ZONE1', '第1地帯', 3, 3, 6, 1, 'ems_official'),
('JPPOST', 'TW', 'Taiwan', '台湾', 'ZONE1', '第1地帯', 3, 3, 6, 1, 'ems_official'),

-- 第2地帯: アジア
('JPPOST', 'SG', 'Singapore', 'シンガポール', 'ZONE2', '第2地帯', 3, 3, 6, 2, 'ems_official'),
('JPPOST', 'HK', 'Hong Kong', '香港', 'ZONE2', '第2地帯', 3, 3, 6, 2, 'ems_official'),
('JPPOST', 'TH', 'Thailand', 'タイ', 'ZONE2', '第2地帯', 3, 3, 6, 2, 'ems_official'),
('JPPOST', 'PH', 'Philippines', 'フィリピン', 'ZONE2', '第2地帯', 3, 3, 6, 2, 'ems_official'),

-- 第3地帯: ヨーロッパ・オセアニア等
('JPPOST', 'GB', 'United Kingdom', 'イギリス', 'ZONE3', '第3地帯', 3, 3, 6, 3, 'ems_official'),
('JPPOST', 'DE', 'Germany', 'ドイツ', 'ZONE3', '第3地帯', 3, 3, 6, 3, 'ems_official'),
('JPPOST', 'FR', 'France', 'フランス', 'ZONE3', '第3地帯', 3, 3, 6, 3, 'ems_official'),
('JPPOST', 'AU', 'Australia', 'オーストラリア', 'ZONE3', '第3地帯', 3, 3, 6, 3, 'ems_official'),
('JPPOST', 'CA', 'Canada', 'カナダ', 'ZONE3', '第3地帯', 3, 3, 6, 3, 'ems_official'),

-- 第4地帯: アメリカ
('JPPOST', 'US', 'United States', 'アメリカ合衆国', 'ZONE4', '第4地帯', 3, 3, 6, 4, 'ems_official'),

-- 第5地帯: 中南米・アフリカ
('JPPOST', 'BR', 'Brazil', 'ブラジル', 'ZONE5', '第5地帯', 3, 3, 6, 5, 'ems_official'),
('JPPOST', 'MX', 'Mexico', 'メキシコ', 'ZONE5', '第5地帯', 3, 3, 6, 5, 'ems_official'),
('JPPOST', 'ZA', 'South Africa', '南アフリカ', 'ZONE5', '第5地帯', 3, 3, 6, 5, 'ems_official');

-- =============================================================================
-- CPass ゾーン定義
-- =============================================================================

-- CPass ゾーン定義
INSERT INTO carrier_zone_definitions (carrier_code, carrier_name, zone_system_name, zone_code, zone_display_name, zone_description, zone_color, sort_order) VALUES
('CPASS', 'CPass SpeedPAK', 'CPASS_COUNTRY_ZONES', 'USA', 'USA対応', 'アメリカ向けSpeedPAK', '#1E90FF', 1),
('CPASS', 'CPass SpeedPAK', 'CPASS_COUNTRY_ZONES', 'UK', 'UK対応', 'イギリス向けSpeedPAK', '#32CD32', 2),
('CPASS', 'CPass SpeedPAK', 'CPASS_COUNTRY_ZONES', 'DE', 'DE対応', 'ドイツ向けSpeedPAK', '#FFD700', 3),
('CPASS', 'CPass SpeedPAK', 'CPASS_COUNTRY_ZONES', 'AU', 'AU対応', 'オーストラリア向けSpeedPAK', '#FF69B4', 4);

-- CPass 国別ゾーン（4カ国限定）
INSERT INTO carrier_country_zones (carrier_code, country_code, country_name_en, country_name_ja, zone_code, zone_display_name, service_level, estimated_delivery_days_min, estimated_delivery_days_max, base_price_tier, data_source) VALUES
('CPASS', 'US', 'United States', 'アメリカ合衆国', 'USA', 'USA対応', 2, 8, 12, 2, 'cpass_official'),
('CPASS', 'GB', 'United Kingdom', 'イギリス', 'UK', 'UK対応', 2, 7, 10, 2, 'cpass_official'),
('CPASS', 'DE', 'Germany', 'ドイツ', 'DE', 'DE対応', 2, 7, 11, 2, 'cpass_official'),
('CPASS', 'AU', 'Australia', 'オーストラリア', 'AU', 'AU対応', 2, 6, 12, 2, 'cpass_official');

-- =============================================================================
-- ゾーン可視化データ生成
-- =============================================================================

-- ゾーン可視化サマリー更新
INSERT INTO zone_visualization_data (carrier_code, zone_code, country_count, sample_countries, avg_delivery_days, price_tier_range, coverage_description) 
SELECT 
    ccz.carrier_code,
    ccz.zone_code,
    COUNT(*) as country_count,
    ARRAY_AGG(ccz.country_name_ja ORDER BY ccz.country_name_ja LIMIT 5) as sample_countries,
    AVG((ccz.estimated_delivery_days_min + ccz.estimated_delivery_days_max) / 2.0) as avg_delivery_days,
    MIN(ccz.base_price_tier) || '-' || MAX(ccz.base_price_tier) as price_tier_range,
    CASE 
        WHEN ccz.carrier_code = 'ELOGI' THEN 'サービスレベル別ゾーン'
        WHEN ccz.carrier_code = 'JPPOST' THEN '地理的距離別ゾーン'
        WHEN ccz.carrier_code = 'CPASS' THEN '対応国限定ゾーン'
    END as coverage_description
FROM carrier_country_zones ccz
GROUP BY ccz.carrier_code, ccz.zone_code;

-- =============================================================================
-- 検索・比較関数
-- =============================================================================

-- 国別全社ゾーン取得関数
CREATE OR REPLACE FUNCTION get_country_all_zones(p_country_code VARCHAR(5))
RETURNS TABLE (
    carrier_name VARCHAR(100),
    zone_display_name VARCHAR(50),
    zone_description TEXT,
    zone_color VARCHAR(10),
    is_supported BOOLEAN,
    delivery_days VARCHAR(20),
    price_tier INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        czd.carrier_name,
        ccz.zone_display_name,
        czd.zone_description,
        czd.zone_color,
        ccz.is_supported,
        ccz.estimated_delivery_days_min || '-' || ccz.estimated_delivery_days_max || '日',
        ccz.base_price_tier
    FROM carrier_country_zones ccz
    JOIN carrier_zone_definitions czd ON ccz.carrier_code = czd.carrier_code 
                                     AND ccz.zone_code = czd.zone_code
    WHERE ccz.country_code = p_country_code
    ORDER BY czd.sort_order;
END;
$$ LANGUAGE plpgsql;

-- 配送会社別ゾーン一覧関数
CREATE OR REPLACE FUNCTION get_carrier_zone_summary(p_carrier_code VARCHAR(20))
RETURNS TABLE (
    zone_display_name VARCHAR(50),
    country_count INTEGER,
    sample_countries TEXT[],
    avg_delivery_days NUMERIC,
    coverage_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vzd.zone_code as zone_display_name,
        vzd.country_count,
        vzd.sample_countries,
        vzd.avg_delivery_days,
        vzd.coverage_description
    FROM zone_visualization_data vzd
    WHERE vzd.carrier_code = p_carrier_code
    ORDER BY vzd.zone_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 動作確認
-- =============================================================================

\echo ''
\echo '=== アメリカ（US）の全社ゾーン確認 ==='
SELECT * FROM get_country_all_zones('US');

\echo ''
\echo '=== eLogi ゾーン一覧 ==='
SELECT * FROM get_carrier_zone_summary('ELOGI');

\echo ''
\echo '=== EMS ゾーン一覧 ==='  
SELECT * FROM get_carrier_zone_summary('JPPOST');

\echo ''
\echo '=== CPass ゾーン一覧 ==='
SELECT * FROM get_carrier_zone_summary('CPASS');

\echo ''
\echo '=== データベース統計 ==='
SELECT 
    'ゾーン定義' as table_name, COUNT(*) as records FROM carrier_zone_definitions
UNION ALL
SELECT 
    '国ゾーンマッピング' as table_name, COUNT(*) as records FROM carrier_country_zones
UNION ALL
SELECT 
    '可視化データ' as table_name, COUNT(*) as records FROM zone_visualization_data;

\echo ''
\echo '✅ 配送会社別ゾーン体系完全分離システム構築完了'
\echo '各社のゾーン体系が独立管理され、国別の各社対応状況が明確になりました'