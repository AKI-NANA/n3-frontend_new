-- ====================================
-- 高精度送料・利益計算システム完全版DB設計
-- ====================================

-- 1. 送料サービス統合管理テーブル
CREATE TABLE shipping_services (
    service_id SERIAL PRIMARY KEY,
    carrier_name VARCHAR(100) NOT NULL, -- 'eLogi', 'cpass', '日本郵便'
    service_name VARCHAR(100) NOT NULL, -- 'FedEx IE', 'SpeedPAK', 'EMS'
    service_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- 物理的制限
    max_weight_kg NUMERIC(10, 2) NOT NULL,
    max_length_cm NUMERIC(10, 2) NOT NULL,
    max_width_cm NUMERIC(10, 2) NOT NULL,
    max_height_cm NUMERIC(10, 2) NOT NULL,
    max_girth_cm NUMERIC(10, 2), -- 胴回り制限
    
    -- サービス特性
    tracking_available BOOLEAN DEFAULT TRUE,
    insurance_available BOOLEAN DEFAULT TRUE,
    signature_required BOOLEAN DEFAULT FALSE,
    estimated_delivery_days_min INTEGER,
    estimated_delivery_days_max INTEGER,
    
    -- 管理情報
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 重量・国別料金マトリックス
CREATE TABLE shipping_rates (
    rate_id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES shipping_services(service_id),
    destination_country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    weight_from_kg NUMERIC(10, 3) NOT NULL,
    weight_to_kg NUMERIC(10, 3) NOT NULL,
    base_cost_usd NUMERIC(10, 2) NOT NULL,
    
    -- 容積重量計算係数
    volumetric_divisor INTEGER DEFAULT 5000, -- FedEx/DHL: 5000, 郵便: 6000
    
    UNIQUE(service_id, destination_country_code, weight_from_kg, weight_to_kg)
);

-- 3. 追加費用管理テーブル
CREATE TABLE additional_fees (
    fee_id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES shipping_services(service_id),
    fee_type VARCHAR(50) NOT NULL, -- 'fuel_surcharge', 'insurance', 'signature', 'oversize'
    fee_name VARCHAR(100) NOT NULL,
    
    -- 費用計算方法
    cost_type VARCHAR(20) NOT NULL, -- 'fixed', 'percentage', 'tiered'
    fixed_cost_usd NUMERIC(10, 2) DEFAULT 0,
    percentage_rate NUMERIC(5, 4) DEFAULT 0, -- 0.1500 = 15%
    
    -- 適用条件
    condition_description TEXT,
    min_weight_kg NUMERIC(10, 2),
    max_weight_kg NUMERIC(10, 2),
    min_length_cm NUMERIC(10, 2),
    max_length_cm NUMERIC(10, 2),
    min_declared_value_usd NUMERIC(10, 2),
    max_declared_value_usd NUMERIC(10, 2),
    
    -- 管理情報
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 4. 固定費用管理テーブル
CREATE TABLE fixed_costs (
    cost_id SERIAL PRIMARY KEY,
    cost_name VARCHAR(100) NOT NULL, -- '梱包材費', '外注工賃費', 'eBay手数料'
    cost_category VARCHAR(50) NOT NULL, -- 'packaging', 'labor', 'platform_fee'
    cost_usd NUMERIC(10, 2) NOT NULL,
    cost_frequency VARCHAR(20) DEFAULT 'per_item', -- 'per_item', 'per_shipment', 'per_order'
    
    -- 適用条件
    applies_to_all BOOLEAN DEFAULT TRUE,
    specific_categories TEXT[], -- 特定カテゴリのみ適用の場合
    min_order_value_usd NUMERIC(10, 2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 商品マスターテーブル
CREATE TABLE item_master (
    item_id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    
    -- 基本情報
    cost_jpy NUMERIC(12, 2) NOT NULL, -- 仕入れ値（日本円）
    weight_kg NUMERIC(10, 3) NOT NULL,
    length_cm NUMERIC(10, 2) NOT NULL,
    width_cm NUMERIC(10, 2) NOT NULL,
    height_cm NUMERIC(10, 2) NOT NULL,
    
    -- eBay情報
    ebay_category_id VARCHAR(20),
    ebay_category_name VARCHAR(200),
    
    -- 競合情報
    competitor_min_price_usd NUMERIC(10, 2),
    competitor_avg_price_usd NUMERIC(10, 2),
    competitor_data_updated TIMESTAMP,
    
    -- 計算結果（キャッシュ）
    calculated_selling_price_usd NUMERIC(10, 2),
    estimated_profit_usd NUMERIC(10, 2),
    estimated_profit_margin_percent NUMERIC(5, 2),
    optimal_shipping_service_id INTEGER REFERENCES shipping_services(service_id),
    
    -- 管理情報
    data_source VARCHAR(50), -- 'yahoo_csv', 'manual_input'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. 価格帯別送料設定テーブル
CREATE TABLE pricing_tiers (
    tier_id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL, -- '低価格帯', '中価格帯', '高価格帯'
    min_price_usd NUMERIC(10, 2) NOT NULL,
    max_price_usd NUMERIC(10, 2), -- NULL = 上限なし
    
    -- 送料設定
    shipping_method VARCHAR(20) NOT NULL, -- 'included', 'separate'
    fixed_shipping_cost_usd NUMERIC(10, 2) DEFAULT 0,
    max_included_shipping_usd NUMERIC(10, 2) DEFAULT 0,
    
    -- 適用範囲
    destination_country_code VARCHAR(3) DEFAULT 'ALL',
    ebay_category_pattern VARCHAR(200) DEFAULT 'ALL',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. ユーザー設定テーブル
CREATE TABLE user_settings (
    setting_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) DEFAULT 'default_user',
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, setting_key)
);

-- 8. 為替レートキャッシュテーブル
CREATE TABLE exchange_rates (
    rate_id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(12, 6) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'ECB', 'OpenExchangeRates'
    fetched_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(from_currency, to_currency)
);

-- 9. 計算履歴テーブル
CREATE TABLE calculation_history (
    calculation_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) DEFAULT 'default_user',
    
    -- 入力値
    input_weight_kg NUMERIC(10, 3),
    input_length_cm NUMERIC(10, 2),
    input_width_cm NUMERIC(10, 2),
    input_height_cm NUMERIC(10, 2),
    input_destination_country VARCHAR(3),
    input_declared_value_usd NUMERIC(10, 2),
    
    -- 計算結果
    selected_service_id INTEGER REFERENCES shipping_services(service_id),
    total_shipping_cost_usd NUMERIC(10, 2),
    total_ebay_fees_usd NUMERIC(10, 2),
    estimated_profit_usd NUMERIC(10, 2),
    estimated_profit_margin NUMERIC(5, 2),
    
    -- 詳細内訳（JSON形式）
    cost_breakdown JSONB,
    all_candidates JSONB,
    
    calculation_timestamp TIMESTAMP DEFAULT NOW()
);

-- 10. 競合価格履歴テーブル
CREATE TABLE competitor_price_history (
    price_id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) REFERENCES item_master(item_code),
    
    -- eBay検索情報
    search_query VARCHAR(500),
    ebay_item_id VARCHAR(50),
    ebay_seller_id VARCHAR(100),
    
    -- 価格情報
    listing_price_usd NUMERIC(10, 2),
    shipping_cost_usd NUMERIC(10, 2),
    total_price_usd NUMERIC(10, 2),
    
    -- 出品情報
    condition_description VARCHAR(100),
    listing_format VARCHAR(20), -- 'Auction', 'FixedPrice'
    end_time TIMESTAMP,
    
    -- 取得情報
    data_source VARCHAR(50) DEFAULT 'ebay_api',
    fetched_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- 初期データ投入
-- ====================================

-- デフォルトユーザー設定
INSERT INTO user_settings (setting_key, setting_value, setting_type, description) VALUES
('safety_margin_percent', '2.5', 'number', '安全マージン（%）'),
('min_profit_margin_percent', '20.0', 'number', '最低利益率（%）'),
('min_profit_amount_usd', '5.0', 'number', '最低利益額（USD）'),
('default_exchange_rate_usd_jpy', '148.5', 'number', 'デフォルト為替レート'),
('auto_update_competitor_prices', 'true', 'boolean', '競合価格自動更新'),
('competitor_price_update_frequency_hours', '24', 'number', '競合価格更新頻度（時間）');

-- 価格帯設定（デフォルト）
INSERT INTO pricing_tiers (tier_name, min_price_usd, max_price_usd, shipping_method, fixed_shipping_cost_usd, max_included_shipping_usd) VALUES
('低価格帯', 0.00, 50.00, 'separate', 15.00, 0.00),
('中価格帯', 50.01, 100.00, 'included', 0.00, 25.00),
('高価格帯', 100.01, NULL, 'included', 0.00, 50.00);

-- 固定費用（デフォルト）
INSERT INTO fixed_costs (cost_name, cost_category, cost_usd, cost_frequency) VALUES
('梱包材費', 'packaging', 2.50, 'per_item'),
('外注工賃費', 'labor', 3.00, 'per_item'),
('PayPal手数料', 'platform_fee', 0.00, 'per_item'), -- パーセンテージで計算
('eBay Final Value Fee', 'platform_fee', 0.00, 'per_item'), -- パーセンテージで計算
('国際手数料', 'platform_fee', 0.00, 'per_item'); -- パーセンテージで計算

-- ====================================
-- インデックス作成
-- ====================================

-- パフォーマンス向上用インデックス
CREATE INDEX idx_shipping_rates_lookup ON shipping_rates(service_id, destination_country_code, weight_from_kg, weight_to_kg);
CREATE INDEX idx_item_master_category ON item_master(ebay_category_id);
CREATE INDEX idx_calculation_history_user_time ON calculation_history(user_id, calculation_timestamp DESC);
CREATE INDEX idx_competitor_prices_item ON competitor_price_history(item_code, fetched_at DESC);
CREATE INDEX idx_additional_fees_service ON additional_fees(service_id, fee_type, is_active);

-- ====================================
-- ビュー作成
-- ====================================

-- 最新競合価格ビュー
CREATE VIEW latest_competitor_prices AS
SELECT DISTINCT ON (item_code) 
    item_code,
    listing_price_usd,
    shipping_cost_usd,
    total_price_usd,
    fetched_at
FROM competitor_price_history 
ORDER BY item_code, fetched_at DESC;

-- 有効な送料サービスビュー
CREATE VIEW active_shipping_services AS
SELECT 
    s.service_id,
    s.carrier_name,
    s.service_name,
    s.service_code,
    s.max_weight_kg,
    s.max_length_cm,
    s.max_width_cm,
    s.max_height_cm,
    s.tracking_available,
    s.insurance_available,
    s.estimated_delivery_days_min,
    s.estimated_delivery_days_max
FROM shipping_services s
WHERE s.is_active = TRUE
ORDER BY s.carrier_name, s.service_name;
