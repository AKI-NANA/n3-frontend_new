-- 配送管理統合システム データベース拡張
-- 複数業者・地域別制約・サービス管理対応

-- 配送業者拡張（既存テーブル拡張）
ALTER TABLE shipping_carriers ADD COLUMN IF NOT EXISTS 
    regional_restrictions JSONB DEFAULT '{}';

ALTER TABLE shipping_carriers ADD COLUMN IF NOT EXISTS 
    service_types JSONB DEFAULT '[]';

ALTER TABLE shipping_carriers ADD COLUMN IF NOT EXISTS 
    is_usa_only BOOLEAN DEFAULT FALSE;

ALTER TABLE shipping_carriers ADD COLUMN IF NOT EXISTS 
    is_international_only BOOLEAN DEFAULT FALSE;

-- 配送業者グループテーブル（新規）
CREATE TABLE IF NOT EXISTS carrier_groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL UNIQUE,
    group_description TEXT,
    group_priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配送業者グループ関係テーブル
CREATE TABLE IF NOT EXISTS carrier_group_members (
    member_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL,
    carrier_id INTEGER NOT NULL,
    member_priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (group_id) REFERENCES carrier_groups(group_id),
    FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(carrier_id),
    UNIQUE (group_id, carrier_id)
);

-- 地域別業者制約テーブル
CREATE TABLE IF NOT EXISTS regional_carrier_restrictions (
    restriction_id SERIAL PRIMARY KEY,
    carrier_id INTEGER NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    restriction_reason TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    
    FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(carrier_id),
    UNIQUE (carrier_id, country_code)
);

-- 配送サービス管理テーブル
CREATE TABLE IF NOT EXISTS shipping_services (
    service_id SERIAL PRIMARY KEY,
    carrier_id INTEGER NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- economy, express, premium
    service_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 50,
    
    FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(carrier_id),
    UNIQUE (carrier_id, service_code)
);

-- 配送計算ルールテーブル
CREATE TABLE IF NOT EXISTS shipping_calculation_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    priority_order INTEGER DEFAULT 50,
    
    -- 適用条件
    apply_to_countries JSONB, -- 適用国リスト
    apply_to_carriers JSONB, -- 適用業者リスト
    weight_min_kg DECIMAL(8,3),
    weight_max_kg DECIMAL(8,3),
    
    -- 計算ルール
    calculation_method VARCHAR(50) DEFAULT 'rate_table', -- rate_table, formula, api
    base_rate_multiplier DECIMAL(5,3) DEFAULT 1.0,
    additional_fee DECIMAL(10,2) DEFAULT 0.0,
    fuel_surcharge_override DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入
INSERT INTO carrier_groups (group_name, group_description, group_priority) VALUES
('Emoji Class', 'アメリカ専用配送サービス', 1),
('日本郵便系', '国際配送（USA以外メイン）', 2),
('Express専門', '高速配送サービス', 3)
ON CONFLICT (group_name) DO NOTHING;

-- 既存データ更新
UPDATE shipping_carriers SET 
    regional_restrictions = '{"usa_only": false, "excluded_countries": []}',
    service_types = '["economy", "express"]',
    is_usa_only = FALSE,
    is_international_only = TRUE
WHERE carrier_code = 'ELOJI_FEDEX';

-- 新規配送業者追加
INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions, regional_restrictions, service_types, is_usa_only) VALUES
('Emoji Class', 'EMOJI_CLASS', 1, '["USA"]', '{"usa_only": true, "excluded_countries": []}', '["standard", "express"]', TRUE),
('Japan Post EMS', 'JAPAN_POST_EMS', 3, '["WORLDWIDE_EXCEPT_USA"]', '{"usa_only": false, "excluded_countries": ["US"]}', '["economy", "express"]', FALSE),
('DHL Express', 'DHL_EXPRESS', 4, '["WORLDWIDE"]', '{"usa_only": false, "excluded_countries": []}', '["economy", "express", "premium"]', FALSE),
('UPS Worldwide', 'UPS_WORLDWIDE', 5, '["WORLDWIDE"]', '{"usa_only": false, "excluded_countries": []}', '["ground", "express", "next_day"]', FALSE),
('SpeedPac', 'SPEEDPAC', 6, '["ASIA_PACIFIC"]', '{"usa_only": false, "excluded_countries": ["US"]}', '["economy", "express"]', FALSE)
ON CONFLICT (carrier_code) DO NOTHING;

-- グループメンバー設定
INSERT INTO carrier_group_members (group_id, carrier_id, member_priority) 
SELECT 
    cg.group_id,
    sc.carrier_id,
    CASE 
        WHEN sc.carrier_code = 'EMOJI_CLASS' THEN 1
        WHEN sc.carrier_code IN ('ELOJI_FEDEX', 'JAPAN_POST_EMS', 'SPEEDPAC') THEN 2
        ELSE 3
    END
FROM carrier_groups cg
CROSS JOIN shipping_carriers sc
WHERE 
    (cg.group_name = 'Emoji Class' AND sc.carrier_code = 'EMOJI_CLASS')
    OR (cg.group_name = '日本郵便系' AND sc.carrier_code IN ('ELOJI_FEDEX', 'JAPAN_POST_EMS', 'SPEEDPAC'))
    OR (cg.group_name = 'Express専門' AND sc.carrier_code IN ('DHL_EXPRESS', 'UPS_WORLDWIDE'))
ON CONFLICT (group_id, carrier_id) DO NOTHING;

-- 地域制約設定
INSERT INTO regional_carrier_restrictions (carrier_id, country_code, is_allowed, restriction_reason)
SELECT 
    sc.carrier_id,
    'US',
    CASE WHEN sc.carrier_code = 'EMOJI_CLASS' THEN TRUE ELSE FALSE END,
    CASE WHEN sc.carrier_code != 'EMOJI_CLASS' THEN 'USA配送制限' ELSE NULL END
FROM shipping_carriers sc
WHERE sc.carrier_code IN ('EMOJI_CLASS', 'ELOJI_FEDX', 'JAPAN_POST_EMS', 'SPEEDPAC')
ON CONFLICT (carrier_id, country_code) DO NOTHING;

-- 配送サービス登録
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order)
SELECT 
    sc.carrier_id,
    service_data.service_code,
    service_data.service_name,
    service_data.service_type,
    service_data.display_order
FROM shipping_carriers sc
CROSS JOIN (
    VALUES 
        ('economy', 'FedX International Economy', 'economy', 1),
        ('express', 'FedX International Priority', 'express', 2)
) AS service_data(service_code, service_name, service_type, display_order)
WHERE sc.carrier_code = 'ELOJI_FEDX'
ON CONFLICT (carrier_id, service_code) DO NOTHING;

-- 配送管理ビュー作成
CREATE OR REPLACE VIEW shipping_management_view AS
SELECT 
    sc.carrier_id,
    sc.carrier_name,
    sc.carrier_code,
    sc.is_usa_only,
    sc.is_international_only,
    cg.group_name,
    
    -- サービス情報
    STRING_AGG(DISTINCT ss.service_name, ', ') as available_services,
    
    -- 制約情報
    COUNT(CASE WHEN rcr.is_allowed = FALSE THEN 1 END) as restricted_countries_count,
    
    -- 料金情報
    COUNT(DISTINCT cr.rate_id) as total_rates,
    MIN(cr.cost_usd) as min_cost,
    MAX(cr.cost_usd) as max_cost,
    
    sc.is_active as carrier_active
    
FROM shipping_carriers sc
LEFT JOIN carrier_group_members cgm ON sc.carrier_id = cgm.carrier_id
LEFT JOIN carrier_groups cg ON cgm.group_id = cg.group_id
LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
LEFT JOIN regional_carrier_restrictions rcr ON sc.carrier_id = rcr.carrier_id
LEFT JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id
LEFT JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id AND cr.is_active = TRUE
WHERE sc.is_active = TRUE
GROUP BY sc.carrier_id, sc.carrier_name, sc.carrier_code, sc.is_usa_only, sc.is_international_only, cg.group_name, sc.is_active
ORDER BY cg.group_name, sc.priority_order;

-- 配送計算最適化関数
CREATE OR REPLACE FUNCTION find_best_shipping_options(
    p_weight DECIMAL(8,3),
    p_country VARCHAR(3),
    p_service_types TEXT[] DEFAULT ARRAY['economy', 'express']
)
RETURNS TABLE(
    carrier_name TEXT,
    service_name TEXT,
    cost_usd DECIMAL(10,2),
    total_cost_usd DECIMAL(10,2),
    delivery_days TEXT,
    is_optimal BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH shipping_options AS (
        SELECT 
            sc.carrier_name::TEXT,
            ss.service_name::TEXT,
            cr.cost_usd,
            (cr.cost_usd * 1.05 + 
             CASE WHEN ss.service_type = 'express' THEN 3.50 ELSE 2.50 END
            ) as total_cost_usd,
            (cr.delivery_days_min || '-' || cr.delivery_days_max)::TEXT as delivery_days,
            ROW_NUMBER() OVER (ORDER BY 
                (cr.cost_usd * 1.05 + 
                 CASE WHEN ss.service_type = 'express' THEN 3.50 ELSE 2.50 END
                )
            ) as cost_rank
        FROM shipping_carriers sc
        JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id
        JOIN carrier_policies_extended cp ON sc.carrier_id = cp.carrier_id AND cp.policy_type = ss.service_type
        JOIN carrier_rates_extended cr ON cp.policy_id = cr.policy_id
        JOIN shipping_zones sz ON cr.zone_id = sz.zone_id
        LEFT JOIN regional_carrier_restrictions rcr ON sc.carrier_id = rcr.carrier_id AND rcr.country_code = p_country
        WHERE 
            sc.is_active = TRUE
            AND ss.is_active = TRUE
            AND ss.service_type = ANY(p_service_types)
            AND cr.is_active = TRUE
            AND cr.weight_min_kg <= p_weight
            AND cr.weight_max_kg >= p_weight
            AND sz.countries_json::text LIKE '%"' || p_country || '"%'
            AND (rcr.restriction_id IS NULL OR rcr.is_allowed = TRUE)
            AND (
                (sc.is_usa_only = TRUE AND p_country = 'US')
                OR (sc.is_usa_only = FALSE)
            )
    )
    SELECT 
        so.carrier_name,
        so.service_name,
        so.cost_usd,
        so.total_cost_usd,
        so.delivery_days,
        (so.cost_rank = 1) as is_optimal
    FROM shipping_options so
    ORDER BY so.total_cost_usd;
END;
$$ LANGUAGE plpgsql;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '🎉 配送管理統合システム データベース拡張完了';
    RAISE NOTICE '✅ 複数業者対応: Emoji Class, FedX, DHL, UPS, EMS, SpeedPac';
    RAISE NOTICE '✅ 地域制約管理: USA専用・国際専用設定';
    RAISE NOTICE '✅ 最適化計算: find_best_shipping_options() 関数';
    RAISE NOTICE '✅ 管理ビュー: shipping_management_view';
END $$;
