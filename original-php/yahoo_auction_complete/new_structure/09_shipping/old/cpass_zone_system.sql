-- CPassゾーン分類統一システム
-- 目視確認しやすい送料マトリックスUI対応

-- =============================================================================
-- ゾーンマスターテーブル
-- =============================================================================
CREATE TABLE IF NOT EXISTS shipping_zones (
    id SERIAL PRIMARY KEY,
    zone_code VARCHAR(10) NOT NULL UNIQUE,
    zone_name VARCHAR(100) NOT NULL,
    zone_display_order INTEGER NOT NULL,
    zone_color VARCHAR(20) DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 国別ゾーン分類テーブル
-- =============================================================================
CREATE TABLE IF NOT EXISTS country_zone_mapping (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(5) NOT NULL,
    country_name_en VARCHAR(100) NOT NULL,
    country_name_ja VARCHAR(100),
    zone_code VARCHAR(10) NOT NULL,
    carrier_code VARCHAR(20) NOT NULL,
    service_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    data_source VARCHAR(50) DEFAULT 'cpass_zone_table',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_code) REFERENCES shipping_zones(zone_code)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_country_zone_country ON country_zone_mapping(country_code);
CREATE INDEX IF NOT EXISTS idx_country_zone_zone ON country_zone_mapping(zone_code);
CREATE INDEX IF NOT EXISTS idx_country_zone_carrier ON country_zone_mapping(carrier_code);

-- =============================================================================
-- 基本ゾーン定義（目視確認しやすい順序）
-- =============================================================================
INSERT INTO shipping_zones (zone_code, zone_name, zone_display_order, zone_color) VALUES
('zone1', 'ゾーン1 - 北米', 1, '#10b981'),
('zone2', 'ゾーン2 - ヨーロッパ', 2, '#3b82f6'),
('zone3', 'ゾーン3 - オセアニア', 3, '#f59e0b'),
('zone4', 'ゾーン4 - アジア', 4, '#ef4444'),
('zone5', 'ゾーン5 - その他', 5, '#8b5cf6'),
('zone6', 'ゾーン6 - 特殊地域', 6, '#64748b'),
('zone7', 'ゾーン7 - 南米・アフリカ', 7, '#059669'),
('zone8', 'ゾーン8 - 遠隔地', 8, '#dc2626')
ON CONFLICT (zone_code) DO UPDATE SET
    zone_name = EXCLUDED.zone_name,
    zone_display_order = EXCLUDED.zone_display_order,
    zone_color = EXCLUDED.zone_color;

-- =============================================================================
-- 主要国のゾーン分類（CPass基準）
-- 実際のPDF解析後に更新予定
-- =============================================================================
INSERT INTO country_zone_mapping (country_code, country_name_en, country_name_ja, zone_code, carrier_code, service_type) VALUES
-- ゾーン1: 北米
('US', 'United States', 'アメリカ合衆国', 'zone1', 'CPASS', 'all'),
('CA', 'Canada', 'カナダ', 'zone1', 'CPASS', 'all'),

-- ゾーン2: ヨーロッパ主要国
('GB', 'United Kingdom', 'イギリス', 'zone2', 'CPASS', 'all'),
('DE', 'Germany', 'ドイツ', 'zone2', 'CPASS', 'all'),
('FR', 'France', 'フランス', 'zone2', 'CPASS', 'all'),
('IT', 'Italy', 'イタリア', 'zone2', 'CPASS', 'all'),
('ES', 'Spain', 'スペイン', 'zone2', 'CPASS', 'all'),
('NL', 'Netherlands', 'オランダ', 'zone2', 'CPASS', 'all'),

-- ゾーン3: オセアニア
('AU', 'Australia', 'オーストラリア', 'zone3', 'CPASS', 'all'),
('NZ', 'New Zealand', 'ニュージーランド', 'zone3', 'CPASS', 'all'),

-- ゾーン4: アジア
('SG', 'Singapore', 'シンガポール', 'zone4', 'CPASS', 'all'),
('HK', 'Hong Kong', '香港', 'zone4', 'CPASS', 'all'),
('TW', 'Taiwan', '台湾', 'zone4', 'CPASS', 'all'),
('KR', 'South Korea', '韓国', 'zone4', 'CPASS', 'all'),
('TH', 'Thailand', 'タイ', 'zone4', 'CPASS', 'all'),

-- ゾーン5: その他
('BR', 'Brazil', 'ブラジル', 'zone5', 'CPASS', 'all'),
('MX', 'Mexico', 'メキシコ', 'zone5', 'CPASS', 'all'),
('IN', 'India', 'インド', 'zone5', 'CPASS', 'all')

ON CONFLICT (country_code, carrier_code, service_type) DO UPDATE SET
    zone_code = EXCLUDED.zone_code,
    country_name_ja = EXCLUDED.country_name_ja;

-- =============================================================================
-- ゾーン検索関数
-- =============================================================================
CREATE OR REPLACE FUNCTION get_country_zone(
    p_country_code VARCHAR(5),
    p_carrier_code VARCHAR(20) DEFAULT 'CPASS'
) RETURNS VARCHAR(10) AS $$
DECLARE
    v_zone_code VARCHAR(10);
BEGIN
    SELECT zone_code INTO v_zone_code
    FROM country_zone_mapping
    WHERE country_code = UPPER(p_country_code)
    AND carrier_code = p_carrier_code
    AND is_active = TRUE
    LIMIT 1;
    
    -- デフォルトゾーン（見つからない場合）
    RETURN COALESCE(v_zone_code, 'zone5');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- マトリックスUI用ゾーン一覧ビュー
-- =============================================================================
CREATE OR REPLACE VIEW matrix_zone_options AS
SELECT 
    sz.zone_code,
    sz.zone_name,
    sz.zone_display_order,
    sz.zone_color,
    COUNT(czm.id) as country_count,
    STRING_AGG(czm.country_name_ja, ', ' ORDER BY czm.country_name_ja) as countries_ja,
    STRING_AGG(czm.country_name_en, ', ' ORDER BY czm.country_name_en) as countries_en
FROM shipping_zones sz
LEFT JOIN country_zone_mapping czm ON sz.zone_code = czm.zone_code AND czm.is_active = TRUE
WHERE sz.is_active = TRUE
GROUP BY sz.zone_code, sz.zone_name, sz.zone_display_order, sz.zone_color
ORDER BY sz.zone_display_order;

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
DO $$
DECLARE
    zone_count INTEGER;
    country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zone_count FROM shipping_zones WHERE is_active = TRUE;
    SELECT COUNT(*) INTO country_count FROM country_zone_mapping WHERE is_active = TRUE;
    
    RAISE NOTICE '🗺️ CPassゾーン分類システム構築完了';
    RAISE NOTICE 'ゾーン数: % 個', zone_count;
    RAISE NOTICE '国別マッピング: % 件', country_count;
    RAISE NOTICE '目視確認しやすいUI準備完了';
END $$;