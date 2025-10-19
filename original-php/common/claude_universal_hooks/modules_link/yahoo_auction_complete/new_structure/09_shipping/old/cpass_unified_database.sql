-- CPass基準データベース完全再構築
-- 既存の矛盾データを削除し、CPass基準で統一

-- =============================================================================
-- 既存データの完全削除
-- =============================================================================
DROP TABLE IF EXISTS real_shipping_rates CASCADE;
DROP TABLE IF EXISTS country_zone_mapping CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;

-- ビューも削除
DROP VIEW IF EXISTS matrix_zone_options CASCADE;
DROP VIEW IF EXISTS shipping_rate_comparison CASCADE;

-- 関数も削除
DROP FUNCTION IF EXISTS get_real_shipping_rate(VARCHAR(20), VARCHAR(50), VARCHAR(10), INTEGER);
DROP FUNCTION IF EXISTS get_country_zone(VARCHAR(5), VARCHAR(20));

-- =============================================================================
-- CPass基準テーブル再作成
-- =============================================================================

-- ゾーンマスターテーブル
CREATE TABLE shipping_zones (
    id SERIAL PRIMARY KEY,
    zone_code VARCHAR(10) NOT NULL UNIQUE,
    zone_name VARCHAR(100) NOT NULL,
    zone_display_order INTEGER NOT NULL,
    zone_color VARCHAR(20) DEFAULT '#3b82f6',
    carrier_basis VARCHAR(20) DEFAULT 'CPASS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 国別ゾーン分類テーブル（CPass基準）
CREATE TABLE country_zone_mapping (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(5) NOT NULL,
    country_name_en VARCHAR(100) NOT NULL,
    country_name_ja VARCHAR(100),
    zone_code VARCHAR(10) NOT NULL,
    carrier_basis VARCHAR(20) DEFAULT 'CPASS',
    pdf_source VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_code) REFERENCES shipping_zones(zone_code),
    UNIQUE(country_code, carrier_basis)
);

-- CPass基準実料金テーブル
CREATE TABLE real_shipping_rates (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    zone_code VARCHAR(10) NOT NULL,
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    data_source VARCHAR(100) DEFAULT 'cpass_zone_system',
    pdf_source VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (zone_code) REFERENCES shipping_zones(zone_code)
);

-- インデックス作成
CREATE INDEX idx_country_zone_country ON country_zone_mapping(country_code);
CREATE INDEX idx_country_zone_zone ON country_zone_mapping(zone_code);
CREATE INDEX idx_real_rates_carrier_zone ON real_shipping_rates(carrier_code, zone_code);
CREATE INDEX idx_real_rates_zone_weight ON real_shipping_rates(zone_code, weight_from_g, weight_to_g);

-- =============================================================================
-- CPass基準ゾーン定義（目視確認統一）
-- =============================================================================
INSERT INTO shipping_zones (zone_code, zone_name, zone_display_order, zone_color, carrier_basis) VALUES
('zone1', 'ゾーン1 - 北米・カナダ', 1, '#10b981', 'CPASS'),
('zone2', 'ゾーン2 - ヨーロッパ主要国', 2, '#3b82f6', 'CPASS'),
('zone3', 'ゾーン3 - オセアニア', 3, '#f59e0b', 'CPASS'),
('zone4', 'ゾーン4 - アジア太平洋', 4, '#ef4444', 'CPASS'),
('zone5', 'ゾーン5 - 南米・中東', 5, '#8b5cf6', 'CPASS'),
('zone6', 'ゾーン6 - アフリカ', 6, '#64748b', 'CPASS'),
('zone7', 'ゾーン7 - 特殊地域', 7, '#059669', 'CPASS'),
('zone8', 'ゾーン8 - 遠隔地', 8, '#dc2626', 'CPASS');

-- =============================================================================
-- PDF抽出待ちの暫定国別ゾーン分類
-- 実際のPDF解析後に更新予定
-- =============================================================================
INSERT INTO country_zone_mapping (country_code, country_name_en, country_name_ja, zone_code, pdf_source) VALUES
-- Zone 1: 北米・カナダ
('US', 'United States', 'アメリカ合衆国', 'zone1', 'pending_pdf_extraction'),
('CA', 'Canada', 'カナダ', 'zone1', 'pending_pdf_extraction'),

-- Zone 2: ヨーロッパ主要国
('GB', 'United Kingdom', 'イギリス', 'zone2', 'pending_pdf_extraction'),
('DE', 'Germany', 'ドイツ', 'zone2', 'pending_pdf_extraction'),
('FR', 'France', 'フランス', 'zone2', 'pending_pdf_extraction'),
('IT', 'Italy', 'イタリア', 'zone2', 'pending_pdf_extraction'),
('ES', 'Spain', 'スペイン', 'zone2', 'pending_pdf_extraction'),
('NL', 'Netherlands', 'オランダ', 'zone2', 'pending_pdf_extraction'),

-- Zone 3: オセアニア
('AU', 'Australia', 'オーストラリア', 'zone3', 'pending_pdf_extraction'),
('NZ', 'New Zealand', 'ニュージーランド', 'zone3', 'pending_pdf_extraction'),

-- Zone 4: アジア太平洋
('SG', 'Singapore', 'シンガポール', 'zone4', 'pending_pdf_extraction'),
('HK', 'Hong Kong', '香港', 'zone4', 'pending_pdf_extraction'),
('TW', 'Taiwan', '台湾', 'zone4', 'pending_pdf_extraction'),
('KR', 'South Korea', '韓国', 'zone4', 'pending_pdf_extraction'),
('TH', 'Thailand', 'タイ', 'zone4', 'pending_pdf_extraction'),

-- Zone 5: 南米・中東
('BR', 'Brazil', 'ブラジル', 'zone5', 'pending_pdf_extraction'),
('MX', 'Mexico', 'メキシコ', 'zone5', 'pending_pdf_extraction'),
('AR', 'Argentina', 'アルゼンチン', 'zone5', 'pending_pdf_extraction');

-- =============================================================================
-- CPass基準料金検索関数
-- =============================================================================
CREATE OR REPLACE FUNCTION get_cpass_shipping_rate(
    p_carrier_code VARCHAR(20),
    p_service_code VARCHAR(50),
    p_country_code VARCHAR(5),
    p_weight_g INTEGER
) RETURNS TABLE(
    zone_code VARCHAR(10),
    price_jpy DECIMAL(10,2),
    data_source VARCHAR(100)
) AS $$
DECLARE
    v_zone_code VARCHAR(10);
BEGIN
    -- CPass基準でゾーン取得
    SELECT czm.zone_code INTO v_zone_code
    FROM country_zone_mapping czm
    WHERE czm.country_code = UPPER(p_country_code)
    AND czm.is_active = TRUE
    LIMIT 1;
    
    -- ゾーンが見つからない場合はデフォルト
    v_zone_code := COALESCE(v_zone_code, 'zone5');
    
    -- 料金検索
    RETURN QUERY
    SELECT 
        rsr.zone_code,
        rsr.price_jpy,
        rsr.data_source
    FROM real_shipping_rates rsr
    WHERE rsr.carrier_code = p_carrier_code
    AND rsr.service_code = p_service_code
    AND rsr.zone_code = v_zone_code
    AND rsr.weight_from_g <= p_weight_g
    AND rsr.weight_to_g >= p_weight_g
    AND rsr.effective_date <= CURRENT_DATE
    ORDER BY rsr.last_updated DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- マトリックスUI用統一ビュー
-- =============================================================================
CREATE OR REPLACE VIEW matrix_zone_options AS
SELECT 
    sz.zone_code,
    sz.zone_name,
    sz.zone_display_order,
    sz.zone_color,
    COUNT(czm.id) as country_count,
    STRING_AGG(czm.country_name_ja, ', ' ORDER BY czm.country_name_ja) as countries_ja,
    STRING_AGG(czm.country_name_en, ', ' ORDER BY czm.country_name_en) as countries_en,
    sz.carrier_basis
FROM shipping_zones sz
LEFT JOIN country_zone_mapping czm ON sz.zone_code = czm.zone_code AND czm.is_active = TRUE
WHERE sz.is_active = TRUE
GROUP BY sz.zone_code, sz.zone_name, sz.zone_display_order, sz.zone_color, sz.carrier_basis
ORDER BY sz.zone_display_order;

-- =============================================================================
-- CPass統一料金比較ビュー
-- =============================================================================
CREATE OR REPLACE VIEW cpass_rate_comparison AS
SELECT 
    rsr.zone_code,
    sz.zone_name,
    rsr.weight_from_g,
    rsr.weight_to_g,
    rsr.carrier_code,
    rsr.service_code,
    rsr.price_jpy,
    rsr.data_source,
    ROUND(rsr.price_jpy / ((rsr.weight_to_g + rsr.weight_from_g) / 2000.0), 2) as price_per_kg,
    COUNT(*) OVER(PARTITION BY rsr.zone_code, rsr.weight_from_g) as service_count
FROM real_shipping_rates rsr
JOIN shipping_zones sz ON rsr.zone_code = sz.zone_code
WHERE sz.is_active = TRUE
ORDER BY rsr.zone_code, rsr.weight_from_g, rsr.price_jpy;

-- =============================================================================
-- PDF抽出準備完了メッセージ
-- =============================================================================
DO $$
DECLARE
    zone_count INTEGER;
    temp_country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zone_count FROM shipping_zones WHERE is_active = TRUE;
    SELECT COUNT(*) INTO temp_country_count FROM country_zone_mapping WHERE pdf_source = 'pending_pdf_extraction';
    
    RAISE NOTICE '🔄 CPass基準データベース再構築完了';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ゾーン数: % 個 (CPass基準)', zone_count;
    RAISE NOTICE '暫定国マッピング: % 件', temp_country_count;
    RAISE NOTICE '';
    RAISE NOTICE '⏳ PDF抽出待ちの処理:';
    RAISE NOTICE '1. DHL_ゾーン表.pdf → ゾーン分類抽出';
    RAISE NOTICE '2. FedExゾーン表.pdf → ゾーン分類抽出';
    RAISE NOTICE '3. UPSゾーン表.pdf → ゾーン分類抽出';
    RAISE NOTICE '4. 実料金データの投入';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 既存の矛盾データは完全削除済み';
    RAISE NOTICE '✅ CPass基準で統一されたスキーマ準備完了';
    RAISE NOTICE '✅ マトリックスUI対応済み';
END $$;