-- PostgreSQL版 配送業者比較システム データベーススキーマ

-- 配送業者マスター
CREATE TABLE IF NOT EXISTS shipping_carriers (
    carrier_id SERIAL PRIMARY KEY,
    carrier_name VARCHAR(50) NOT NULL UNIQUE,
    carrier_code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INTEGER DEFAULT 50,
    coverage_regions JSONB, -- 対応地域
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ挿入
INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions) 
VALUES
('Eloji (FedEx)', 'ELOJI_FEDEX', 1, '["WORLDWIDE"]'),
('Orange Connex', 'ORANGE_CONNEX', 2, '["WORLDWIDE_EXCEPT_USA"]')
ON CONFLICT (carrier_code) DO NOTHING;

-- 業者別ポリシーテーブル
CREATE TABLE IF NOT EXISTS carrier_policies (
    policy_id SERIAL PRIMARY KEY,
    carrier_id INTEGER NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(20) NOT NULL CHECK (policy_type IN ('economy', 'express')),
    service_name VARCHAR(255), -- FedEx International Priority等
    
    -- 基本設定
    usa_base_cost DECIMAL(10,2) DEFAULT 0.00,
    fuel_surcharge_percent DECIMAL(5,2) DEFAULT 5.0,
    handling_fee DECIMAL(10,2) DEFAULT 2.50,
    max_weight_kg DECIMAL(8,3) DEFAULT 30.0,
    max_length_cm DECIMAL(8,2) DEFAULT 200.0,
    
    -- 配送設定
    default_delivery_days_min INTEGER DEFAULT 3,
    default_delivery_days_max INTEGER DEFAULT 7,
    tracking_included BOOLEAN DEFAULT TRUE,
    signature_required BOOLEAN DEFAULT FALSE,
    
    -- 制約・地域設定
    excluded_countries JSONB,
    restricted_items JSONB,
    
    policy_status VARCHAR(20) DEFAULT 'active' CHECK (policy_status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(carrier_id),
    UNIQUE (carrier_id, policy_type)
);

-- 配送ゾーンテーブル
CREATE TABLE IF NOT EXISTS shipping_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(255) NOT NULL UNIQUE,
    zone_type VARCHAR(50) DEFAULT 'international',
    countries_json JSONB,
    zone_priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 業者別料金テーブル
CREATE TABLE IF NOT EXISTS carrier_rates (
    rate_id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    
    -- 重量・サイズ範囲
    weight_min_kg DECIMAL(8,3) NOT NULL DEFAULT 0.0,
    weight_max_kg DECIMAL(8,3) NOT NULL,
    length_max_cm DECIMAL(8,2),
    width_max_cm DECIMAL(8,2),
    height_max_cm DECIMAL(8,2),
    
    -- 料金設定
    cost_usd DECIMAL(10,2) NOT NULL,
    cost_jpy DECIMAL(10,2), -- 円建て料金
    
    -- 配送設定
    delivery_days_min INTEGER,
    delivery_days_max INTEGER,
    
    -- 特別料金
    oversized_surcharge DECIMAL(10,2) DEFAULT 0.00,
    remote_area_surcharge DECIMAL(10,2) DEFAULT 0.00,
    
    -- 有効性
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (policy_id) REFERENCES carrier_policies(policy_id),
    FOREIGN KEY (zone_id) REFERENCES shipping_zones(zone_id),
    
    UNIQUE (policy_id, zone_id, weight_min_kg, weight_max_kg)
);

-- 料金比較ログテーブル
CREATE TABLE IF NOT EXISTS rate_comparison_log (
    comparison_id SERIAL PRIMARY KEY,
    
    -- リクエスト情報
    product_id VARCHAR(255),
    weight_kg DECIMAL(8,3) NOT NULL,
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    destination_country VARCHAR(3) NOT NULL,
    destination_zone_id INTEGER,
    
    -- 比較結果
    best_carrier_id INTEGER,
    best_policy_id INTEGER,
    best_rate_id INTEGER,
    best_cost_usd DECIMAL(10,2),
    best_delivery_days VARCHAR(20),
    
    -- 全比較データ
    comparison_results JSONB, -- 全業者の結果
    
    -- メタデータ
    calculation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_session_id VARCHAR(255),
    
    FOREIGN KEY (best_carrier_id) REFERENCES shipping_carriers(carrier_id),
    FOREIGN KEY (best_policy_id) REFERENCES carrier_policies(policy_id),
    FOREIGN KEY (best_rate_id) REFERENCES carrier_rates(rate_id),
    FOREIGN KEY (destination_zone_id) REFERENCES shipping_zones(zone_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_carrier_policies_carrier_type ON carrier_policies(carrier_id, policy_type, policy_status);
CREATE INDEX IF NOT EXISTS idx_carrier_rates_policy_zone_weight ON carrier_rates(policy_id, zone_id, weight_min_kg, weight_max_kg);
CREATE INDEX IF NOT EXISTS idx_carrier_rates_active ON carrier_rates(is_active, effective_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_comparison_log_time ON rate_comparison_log(calculation_time);
CREATE INDEX IF NOT EXISTS idx_comparison_log_destination ON rate_comparison_log(destination_country, destination_zone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_countries ON shipping_zones USING GIN (countries_json);

-- 配送業者比較ビュー
CREATE OR REPLACE VIEW carrier_comparison_view AS
SELECT 
    cl.comparison_id,
    cl.product_id,
    cl.weight_kg,
    cl.destination_country,
    
    -- 最安業者情報
    sc.carrier_name as best_carrier,
    cp.policy_name as best_policy,
    cp.policy_type as best_service_type,
    cl.best_cost_usd,
    cl.best_delivery_days,
    
    -- ゾーン情報
    sz.zone_name as destination_zone,
    
    cl.calculation_time
FROM rate_comparison_log cl
LEFT JOIN shipping_carriers sc ON cl.best_carrier_id = sc.carrier_id
LEFT JOIN carrier_policies cp ON cl.best_policy_id = cp.policy_id
LEFT JOIN shipping_zones sz ON cl.destination_zone_id = sz.zone_id
ORDER BY cl.calculation_time DESC;

-- updated_at自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_shipping_carriers_updated_at BEFORE UPDATE ON shipping_carriers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carrier_policies_updated_at BEFORE UPDATE ON carrier_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carrier_rates_updated_at BEFORE UPDATE ON carrier_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
