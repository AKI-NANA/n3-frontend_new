-- 配送料金システム改良版 データベース設計
-- Phase 1: 0.1kg刻み対応 + 階層的地域管理

-- 階層的地域テーブル（Gemini提案ベース）
CREATE TABLE shipping_regions_v2 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE, -- 'zone_a', 'eur_1', 'gb'等
    parent_id INT REFERENCES shipping_regions_v2(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('zone', 'region_group', 'country')),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 0.1kg刻み対応の詳細料金テーブル
CREATE TABLE shipping_rates_detailed (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES shipping_carriers(carrier_id),
    service_id INT REFERENCES shipping_services(service_id),
    region_id INT REFERENCES shipping_regions_v2(id),
    
    -- 重量をグラム単位で管理（計算誤差回避）
    from_weight_g INT NOT NULL, -- 100g = 0.1kg
    to_weight_g INT NOT NULL,   -- 500g = 0.5kg
    
    -- 料金データ
    rate_usd DECIMAL(10, 4) NOT NULL,
    rate_jpy DECIMAL(10, 2), -- 為替計算結果キャッシュ
    
    -- 梱包制約（料金決定後の制約表示用）
    min_packaging_type VARCHAR(50), -- 'envelope', 'pak', 'small_box'
    max_packaging_type VARCHAR(50),
    packaging_constraints JSONB, -- 詳細制約情報
    
    -- 配送情報
    delivery_days_min INT,
    delivery_days_max INT,
    
    -- メタデータ
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    last_updated TIMESTAMP DEFAULT NOW(),
    data_source VARCHAR(50) DEFAULT 'manual' -- 'api', 'csv', 'manual'
);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_shipping_rates_lookup ON shipping_rates_detailed 
    (carrier_id, region_id, from_weight_g, to_weight_g) 
    WHERE is_active = TRUE;

CREATE INDEX idx_weight_range ON shipping_rates_detailed 
    (from_weight_g, to_weight_g) 
    WHERE is_active = TRUE;

-- 地域階層検索用インデックス
CREATE INDEX idx_regions_hierarchy ON shipping_regions_v2 (parent_id, type, is_active);

-- 梱包制約マスターテーブル
CREATE TABLE packaging_constraints (
    id SERIAL PRIMARY KEY,
    packaging_type VARCHAR(50) UNIQUE NOT NULL,
    max_weight_g INT NOT NULL,
    max_length_mm INT,
    max_width_mm INT,
    max_height_mm INT,
    volume_limit_cm3 INT,
    description TEXT,
    usage_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 利益計算統合テーブル
CREATE TABLE profit_calculations (
    id SERIAL PRIMARY KEY,
    calculation_id UUID DEFAULT gen_random_uuid(),
    
    -- 商品情報
    product_weight_g INT NOT NULL,
    product_dimensions JSONB, -- {length: 100, width: 80, height: 50}
    
    -- 価格情報
    purchase_price_jpy DECIMAL(10, 2) NOT NULL,
    domestic_shipping_jpy DECIMAL(10, 2) DEFAULT 0,
    
    -- 選択された配送オプション
    selected_rate_id INT REFERENCES shipping_rates_detailed(id),
    international_shipping_usd DECIMAL(10, 4),
    international_shipping_jpy DECIMAL(10, 2),
    
    -- 計算結果
    total_cost_jpy DECIMAL(10, 2),
    selling_price_usd DECIMAL(10, 4),
    selling_price_jpy DECIMAL(10, 2),
    profit_jpy DECIMAL(10, 2),
    profit_margin_percent DECIMAL(5, 2),
    
    -- メタデータ
    destination_region_id INT REFERENCES shipping_regions_v2(id),
    exchange_rate_used DECIMAL(8, 4),
    calculated_at TIMESTAMP DEFAULT NOW(),
    user_session_id VARCHAR(100)
);

-- 地域データ初期投入（PDFベースの3層構造）
INSERT INTO shipping_regions_v2 (name, code, type, parent_id) VALUES
-- ゾーンレベル（輸出ゾーンチャート対応）
('Zone A', 'zone_a', 'zone', NULL),
('Zone B', 'zone_b', 'zone', NULL),
('Zone C', 'zone_c', 'zone', NULL),

-- ヨーロッパ3地域分割
('Europe Region 1', 'eur_1', 'region_group', 1), -- Zone A配下
('Europe Region 2', 'eur_2', 'region_group', 1),
('Europe Region 3', 'eur_3', 'region_group', 2), -- Zone B配下

-- アジア地域
('Asia Pacific 1', 'asia_1', 'region_group', 1),
('Asia Pacific 2', 'asia_2', 'region_group', 2),

-- 北米地域
('North America', 'na_1', 'region_group', 1),

-- 国レベル（価格差対応）
('United Kingdom', 'gb', 'country', 4), -- Europe Region 1配下
('Germany', 'de', 'country', 4),
('France', 'fr', 'country', 4),
('Netherlands', 'nl', 'country', 4),

('Italy', 'it', 'country', 5), -- Europe Region 2配下
('Spain', 'es', 'country', 5),
('Austria', 'at', 'country', 5),

('Poland', 'pl', 'country', 6), -- Europe Region 3配下
('Czech Republic', 'cz', 'country', 6),

('United States', 'us', 'country', 9), -- North America配下
('Canada', 'ca', 'country', 9),

('China', 'cn', 'country', 7), -- Asia Pacific 1配下
('Japan', 'jp', 'country', 7),
('South Korea', 'kr', 'country', 7),

('India', 'in', 'country', 8), -- Asia Pacific 2配下
('Thailand', 'th', 'country', 8),
('Vietnam', 'vn', 'country', 8);

-- 梱包制約データ初期投入
INSERT INTO packaging_constraints (packaging_type, max_weight_g, max_length_mm, max_width_mm, max_height_mm, description, usage_instructions) VALUES
('envelope', 500, 380, 270, 20, 'エンベロープ', '書類・薄型商品用。重量500g以下、厚さ2cm以下'),
('pak', 2000, 380, 300, 50, 'パック', '薄型・軽量商品用。重量2kg以下、厚さ5cm以下'),
('small_box', 5000, 300, 200, 150, '小型ボックス', '小型商品用。一辺30cm以下、重量5kg以下'),
('medium_box', 10000, 400, 300, 250, '中型ボックス', '中型商品用。一辺40cm以下、重量10kg以下'),
('large_box', 25000, 600, 400, 350, '大型ボックス', '大型商品用。一辺60cm以下、重量25kg以下'),
('extra_large', 50000, 1000, 800, 600, '特大ボックス', '特大商品用。特別料金適用');

-- サンプル詳細料金データ（0.1kg刻み）
-- FedEx Express - イギリス向け（国別価格設定例）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) VALUES
-- 0.1kg刻み
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 100, 200, 12.50, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 200, 300, 13.20, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 300, 400, 13.90, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 400, 500, 14.60, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 500, 600, 16.20, 1, 3, 'pak', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), 600, 700, 17.80, 1, 3, 'pak', 'api'),

-- ドイツ向け（異なる価格設定）
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), 100, 200, 11.80, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), 200, 300, 12.50, 1, 3, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), 300, 400, 13.20, 1, 3, 'envelope', 'api'),

-- フォールバック用地域グループ料金（国別料金がない場合）
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'eur_1'), 100, 200, 13.00, 2, 4, 'envelope', 'api'),
(1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'eur_1'), 200, 300, 13.70, 2, 4, 'envelope', 'api');

-- 料金検索用の高速化関数
CREATE OR REPLACE FUNCTION find_shipping_rate(
    p_carrier_id INT,
    p_service_id INT,
    p_region_id INT,
    p_weight_g INT
) RETURNS TABLE (
    rate_id INT,
    rate_usd DECIMAL(10,4),
    min_packaging VARCHAR(50),
    delivery_days_min INT,
    delivery_days_max INT,
    search_level TEXT
) AS $$
BEGIN
    -- 1. 直接的な地域マッチ
    RETURN QUERY
    SELECT 
        sr.id, sr.rate_usd, sr.min_packaging_type, 
        sr.delivery_days_min, sr.delivery_days_max, 'exact'::TEXT
    FROM shipping_rates_detailed sr
    WHERE sr.carrier_id = p_carrier_id 
      AND sr.service_id = p_service_id
      AND sr.region_id = p_region_id
      AND sr.from_weight_g <= p_weight_g 
      AND sr.to_weight_g >= p_weight_g
      AND sr.is_active = TRUE
    LIMIT 1;
    
    -- 2. 見つからない場合は親地域で検索
    IF NOT FOUND THEN
        RETURN QUERY
        WITH parent_region AS (
            SELECT parent_id FROM shipping_regions_v2 WHERE id = p_region_id
        )
        SELECT 
            sr.id, sr.rate_usd, sr.min_packaging_type,
            sr.delivery_days_min, sr.delivery_days_max, 'parent'::TEXT
        FROM shipping_rates_detailed sr, parent_region pr
        WHERE sr.carrier_id = p_carrier_id 
          AND sr.service_id = p_service_id
          AND sr.region_id = pr.parent_id
          AND sr.from_weight_g <= p_weight_g 
          AND sr.to_weight_g >= p_weight_g
          AND sr.is_active = TRUE
        LIMIT 1;
    END IF;
    
    -- 3. さらに見つからない場合はゾーンレベルで検索
    IF NOT FOUND THEN
        RETURN QUERY
        WITH zone_region AS (
            SELECT r2.id 
            FROM shipping_regions_v2 r1
            JOIN shipping_regions_v2 r2 ON r1.parent_id = r2.parent_id
            WHERE r1.id = p_region_id AND r2.type = 'zone'
        )
        SELECT 
            sr.id, sr.rate_usd, sr.min_packaging_type,
            sr.delivery_days_min, sr.delivery_days_max, 'zone'::TEXT
        FROM shipping_rates_detailed sr, zone_region zr
        WHERE sr.carrier_id = p_carrier_id 
          AND sr.service_id = p_service_id
          AND sr.region_id = zr.id
          AND sr.from_weight_g <= p_weight_g 
          AND sr.to_weight_g >= p_weight_g
          AND sr.is_active = TRUE
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 利益計算関数
CREATE OR REPLACE FUNCTION calculate_profit(
    p_weight_g INT,
    p_region_id INT,
    p_purchase_price_jpy DECIMAL(10,2),
    p_domestic_shipping_jpy DECIMAL(10,2),
    p_exchange_rate DECIMAL(8,4),
    p_profit_margin_target DECIMAL(5,2) DEFAULT 25.0
) RETURNS TABLE (
    carrier_name TEXT,
    service_name TEXT,
    shipping_cost_usd DECIMAL(10,4),
    shipping_cost_jpy DECIMAL(10,2),
    total_cost_jpy DECIMAL(10,2),
    suggested_price_usd DECIMAL(10,4),
    suggested_price_jpy DECIMAL(10,2),
    actual_profit_jpy DECIMAL(10,2),
    actual_margin_percent DECIMAL(5,2),
    packaging_required TEXT,
    feasible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.carrier_name::TEXT,
        ss.service_name::TEXT,
        sr.rate_usd,
        (sr.rate_usd * p_exchange_rate)::DECIMAL(10,2) as shipping_cost_jpy,
        (p_purchase_price_jpy + p_domestic_shipping_jpy + (sr.rate_usd * p_exchange_rate))::DECIMAL(10,2) as total_cost,
        ((p_purchase_price_jpy + p_domestic_shipping_jpy + (sr.rate_usd * p_exchange_rate)) * (1 + p_profit_margin_target/100) / p_exchange_rate)::DECIMAL(10,4) as suggested_usd,
        ((p_purchase_price_jpy + p_domestic_shipping_jpy + (sr.rate_usd * p_exchange_rate)) * (1 + p_profit_margin_target/100))::DECIMAL(10,2) as suggested_jpy,
        ((p_purchase_price_jpy + p_domestic_shipping_jpy + (sr.rate_usd * p_exchange_rate)) * p_profit_margin_target/100)::DECIMAL(10,2) as profit,
        p_profit_margin_target,
        COALESCE(sr.min_packaging_type, 'unknown')::TEXT,
        CASE WHEN sr.rate_usd IS NOT NULL THEN TRUE ELSE FALSE END
    FROM shipping_carriers sc
    JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id
    LEFT JOIN shipping_rates_detailed sr ON (
        sc.carrier_id = sr.carrier_id 
        AND ss.service_id = sr.service_id
        AND sr.region_id = p_region_id
        AND sr.from_weight_g <= p_weight_g 
        AND sr.to_weight_g >= p_weight_g
        AND sr.is_active = TRUE
    )
    WHERE sc.is_active = TRUE AND ss.is_active = TRUE
    ORDER BY sr.rate_usd ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regions_modtime 
    BEFORE UPDATE ON shipping_regions_v2 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_rates_modtime 
    BEFORE UPDATE ON shipping_rates_detailed 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- パフォーマンス確認用ビュー
CREATE VIEW shipping_rates_summary AS
SELECT 
    sc.carrier_name,
    ss.service_name,
    sr.name as region_name,
    sr.type as region_type,
    COUNT(srd.id) as rate_count,
    MIN(srd.from_weight_g)/100.0 as min_weight_kg,
    MAX(srd.to_weight_g)/100.0 as max_weight_kg,
    MIN(srd.rate_usd) as min_rate_usd,
    MAX(srd.rate_usd) as max_rate_usd
FROM shipping_carriers sc
JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id
JOIN shipping_rates_detailed srd ON sc.carrier_id = srd.carrier_id AND ss.service_id = srd.service_id
JOIN shipping_regions_v2 sr ON srd.region_id = sr.id
WHERE sc.is_active = TRUE AND ss.is_active = TRUE AND srd.is_active = TRUE
GROUP BY sc.carrier_name, ss.service_name, sr.name, sr.type
ORDER BY sc.carrier_name, ss.service_name, sr.name;
