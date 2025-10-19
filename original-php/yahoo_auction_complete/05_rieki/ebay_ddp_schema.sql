-- eBay DDP/DDU 価格計算システム - Supabase スキーマ定義
-- 作成日: 2025-10-02

-- ============================================
-- 1. HSコードマスタテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS hs_codes (
    code VARCHAR(12) PRIMARY KEY,
    description TEXT NOT NULL,
    base_duty DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    section301 BOOLEAN DEFAULT FALSE,
    section301_rate DECIMAL(5,4) DEFAULT 0.2500,
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HSコード初期データ
INSERT INTO hs_codes (code, description, base_duty, section301, category) VALUES
('9023.00.0000', 'Instruments, apparatus for demonstration', 0.0000, false, 'Educational Equipment'),
('9201.20.0000', 'Pianos, grand', 0.0400, false, 'Musical Instruments'),
('9202.10.0000', 'String musical instruments (Guitars)', 0.0350, false, 'Musical Instruments'),
('9202.90.0000', 'String musical instruments (Other)', 0.0400, false, 'Musical Instruments'),
('6204.62.4011', 'Women''s cotton trousers', 0.1650, true, 'Apparel'),
('6203.42.4011', 'Men''s cotton trousers', 0.1650, true, 'Apparel'),
('8471.30.0100', 'Portable computers', 0.0000, false, 'Electronics'),
('9504.50.0000', 'Video game consoles', 0.0000, false, 'Electronics')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. eBayカテゴリ → HSコードマッピングテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS ebay_category_hs_mapping (
    id SERIAL PRIMARY KEY,
    ebay_category_id INTEGER NOT NULL,
    ebay_category_name TEXT NOT NULL,
    hs_code VARCHAR(12) REFERENCES hs_codes(code),
    confidence_score DECIMAL(3,2) DEFAULT 0.80,
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ebay_category_id, hs_code)
);

-- サンプルマッピング
INSERT INTO ebay_category_hs_mapping (ebay_category_id, ebay_category_name, hs_code, confidence_score, is_primary) VALUES
(619, 'Musical Instruments > Guitars & Basses', '9202.10.0000', 0.95, true),
(619, 'Musical Instruments > Guitars & Basses', '9202.90.0000', 0.85, false),
(293, 'Consumer Electronics > Laptops', '8471.30.0100', 0.90, true),
(171833, 'Video Game Consoles', '9504.50.0000', 0.95, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. eBayカテゴリ手数料テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS ebay_category_fees (
    id SERIAL PRIMARY KEY,
    category_key VARCHAR(255) UNIQUE NOT NULL,
    category_name TEXT NOT NULL,
    fvf DECIMAL(6,4) NOT NULL DEFAULT 0.1315,
    cap DECIMAL(8,2),
    insertion_fee DECIMAL(5,2) NOT NULL DEFAULT 0.35,
    store_discount_basic DECIMAL(6,4) DEFAULT 0.0400,
    store_discount_premium DECIMAL(6,4) DEFAULT 0.0600,
    store_discount_anchor DECIMAL(6,4) DEFAULT 0.0800,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- カテゴリ手数料初期データ
INSERT INTO ebay_category_fees (category_key, category_name, fvf, cap, insertion_fee) VALUES
('Musical Instruments > Guitars & Basses', 'Musical Instruments > Guitars & Basses', 0.0350, 350.00, 0.00),
('Musical Instruments > Other', 'Musical Instruments > Other', 0.1315, NULL, 0.35),
('Antiques', 'Antiques', 0.1315, NULL, 0.35),
('Collectibles', 'Collectibles', 0.1315, NULL, 0.35),
('Art', 'Art', 0.1500, NULL, 0.35),
('Books', 'Books', 0.1315, NULL, 0.35),
('Clothing', 'Clothing', 0.1315, NULL, 0.35),
('Electronics', 'Electronics', 0.0410, NULL, 0.35),
('Jewelry & Watches', 'Jewelry & Watches', 0.1315, NULL, 0.35),
('Toys & Hobbies', 'Toys & Hobbies', 0.1315, NULL, 0.35),
('Home & Garden', 'Home & Garden', 0.1315, NULL, 0.35),
('Sporting Goods', 'Sporting Goods', 0.1315, NULL, 0.35),
('Cameras & Photo', 'Cameras & Photo', 0.0410, NULL, 0.35),
('Video Games', 'Video Games', 0.0410, NULL, 0.35),
('Pet Supplies', 'Pet Supplies', 0.1315, NULL, 0.35),
('Default', 'Default', 0.1315, NULL, 0.35)
ON CONFLICT (category_key) DO NOTHING;

-- ============================================
-- 4. 配送ポリシーテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_policies (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(50) UNIQUE NOT NULL,
    ebay_policy_id VARCHAR(50),
    weight_min DECIMAL(5,2) NOT NULL,
    weight_max DECIMAL(5,2) NOT NULL,
    size_min INTEGER NOT NULL,
    size_max INTEGER NOT NULL,
    price_min DECIMAL(8,2) NOT NULL,
    price_max DECIMAL(8,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 配送ポリシー初期データ
INSERT INTO shipping_policies (policy_name, ebay_policy_id, weight_min, weight_max, size_min, size_max, price_min, price_max) VALUES
('Policy_XS', 'POL_XS_001', 0.0, 0.5, 0, 60, 0.00, 100.00),
('Policy_S', 'POL_S_002', 0.5, 2.0, 60, 100, 100.00, 300.00),
('Policy_M', 'POL_M_003', 2.0, 5.0, 100, 150, 300.00, 800.00),
('Policy_L', 'POL_L_004', 5.0, 15.0, 150, 200, 800.00, 2000.00)
ON CONFLICT (policy_name) DO NOTHING;

-- ============================================
-- 5. 配送ゾーン料金テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_zones (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES shipping_policies(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,
    display_shipping DECIMAL(6,2) NOT NULL,
    actual_cost DECIMAL(6,2) NOT NULL,
    handling_ddp DECIMAL(6,2),
    handling_ddu DECIMAL(6,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, country_code)
);

-- 配送ゾーン初期データ（Policy_XS）
INSERT INTO shipping_zones (policy_id, country_code, display_shipping, actual_cost, handling_ddp, handling_ddu) VALUES
(1, 'US', 15.00, 20.00, 8.00, 2.00),
(1, 'GB', 12.00, 16.00, NULL, 2.00),
(1, 'EU', 13.00, 17.00, NULL, 2.00),
(1, 'CA', 16.00, 20.00, NULL, 2.00),
(1, 'HK', 10.00, 13.00, NULL, 2.00),
(1, 'AU', 18.00, 23.00, NULL, 2.00),
-- Policy_S
(2, 'US', 25.00, 35.00, 12.00, 3.00),
(2, 'GB', 20.00, 28.00, NULL, 3.00),
(2, 'EU', 22.00, 30.00, NULL, 3.00),
(2, 'CA', 28.00, 36.00, NULL, 3.00),
(2, 'HK', 18.00, 24.00, NULL, 3.00),
(2, 'AU', 30.00, 38.00, NULL, 3.00),
-- Policy_M
(3, 'US', 35.00, 50.00, 18.00, 4.00),
(3, 'GB', 30.00, 42.00, NULL, 4.00),
(3, 'EU', 32.00, 45.00, NULL, 4.00),
(3, 'CA', 38.00, 52.00, NULL, 4.00),
(3, 'HK', 28.00, 38.00, NULL, 4.00),
(3, 'AU', 42.00, 56.00, NULL, 4.00),
-- Policy_L
(4, 'US', 50.00, 75.00, 25.00, 5.00),
(4, 'GB', 45.00, 65.00, NULL, 5.00),
(4, 'EU', 48.00, 68.00, NULL, 5.00),
(4, 'CA', 55.00, 80.00, NULL, 5.00),
(4, 'HK', 40.00, 58.00, NULL, 5.00),
(4, 'AU', 60.00, 85.00, NULL, 5.00)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. 利益率設定テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS profit_margin_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('default', 'category', 'country', 'condition')),
    setting_key VARCHAR(100) NOT NULL,
    default_margin DECIMAL(4,3) NOT NULL,
    min_margin DECIMAL(4,3) NOT NULL,
    min_amount DECIMAL(8,2) NOT NULL,
    max_margin DECIMAL(4,3) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(setting_type, setting_key)
);

-- 利益率設定初期データ
INSERT INTO profit_margin_settings (setting_type, setting_key, default_margin, min_margin, min_amount, max_margin) VALUES
('default', 'default', 0.300, 0.200, 10.00, 0.500),
('condition', 'new', 0.100, 0.050, 5.00, 0.200),
('condition', 'used', 0.300, 0.200, 10.00, 0.500),
('country', 'US', 0.250, 0.200, 15.00, 0.350),
('country', 'GB', 0.300, 0.250, 12.00, 0.400),
('country', 'EU', 0.300, 0.250, 12.00, 0.400),
('country', 'CA', 0.280, 0.220, 12.00, 0.380),
('country', 'HK', 0.350, 0.300, 10.00, 0.450),
('country', 'AU', 0.320, 0.270, 15.00, 0.420),
('category', 'Antiques', 0.350, 0.300, 20.00, 0.450),
('category', 'Collectibles', 0.250, 0.200, 10.00, 0.350),
('category', 'Musical Instruments', 0.200, 0.150, 30.00, 0.300)
ON CONFLICT (setting_type, setting_key) DO NOTHING;

-- ============================================
-- 7. 為替レート履歴テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_from VARCHAR(3) NOT NULL DEFAULT 'JPY',
    currency_to VARCHAR(3) NOT NULL DEFAULT 'USD',
    spot_rate DECIMAL(10,6) NOT NULL,
    buffer_percent DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    safe_rate DECIMAL(10,6) NOT NULL,
    source VARCHAR(50) DEFAULT 'Manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 為替レート初期データ
INSERT INTO exchange_rates (spot_rate, buffer_percent, safe_rate, source) VALUES
(154.0000, 3.00, 158.6200, 'Manual Entry');

-- ============================================
-- 8. 原産国マスタテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS origin_countries (
    code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ja VARCHAR(100),
    fta_agreements TEXT[], -- FTA協定リスト
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 原産国初期データ
INSERT INTO origin_countries (code, name, name_ja, fta_agreements) VALUES
('JP', 'Japan', '日本', ARRAY['TPP11', 'RCEP', 'EPA-US']),
('CN', 'China', '中国', ARRAY['RCEP']),
('KR', 'South Korea', '韓国', ARRAY['KORUS', 'RCEP']),
('TW', 'Taiwan', '台湾', ARRAY[]::TEXT[]),
('TH', 'Thailand', 'タイ', ARRAY['RCEP']),
('VN', 'Vietnam', 'ベトナム', ARRAY['TPP11', 'RCEP']),
('IN', 'India', 'インド', ARRAY[]::TEXT[]),
('ID', 'Indonesia', 'インドネシア', ARRAY['RCEP']),
('MY', 'Malaysia', 'マレーシア', ARRAY['TPP11', 'RCEP']),
('PH', 'Philippines', 'フィリピン', ARRAY['RCEP']),
('US', 'United States', 'アメリカ', ARRAY['USMCA']),
('MX', 'Mexico', 'メキシコ', ARRAY['USMCA', 'TPP11']),
('CA', 'Canada', 'カナダ', ARRAY['USMCA', 'TPP11']),
('BR', 'Brazil', 'ブラジル', ARRAY[]::TEXT[]),
('GB', 'United Kingdom', 'イギリス', ARRAY['UK-Japan EPA']),
('DE', 'Germany', 'ドイツ', ARRAY['EU-Japan EPA']),
('FR', 'France', 'フランス', ARRAY['EU-Japan EPA']),
('IT', 'Italy', 'イタリア', ARRAY['EU-Japan EPA']),
('ES', 'Spain', 'スペイン', ARRAY['EU-Japan EPA']),
('PL', 'Poland', 'ポーランド', ARRAY['EU-Japan EPA'])
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 9. 計算履歴テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS calculation_history (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    cost_jpy DECIMAL(10,2) NOT NULL,
    actual_weight DECIMAL(6,2) NOT NULL,
    length INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    dest_country VARCHAR(2) NOT NULL,
    origin_country VARCHAR(2) NOT NULL,
    hs_code VARCHAR(12),
    category VARCHAR(255),
    store_type VARCHAR(20),
    refundable_fees_jpy DECIMAL(10,2) DEFAULT 0.00,
    
    -- 計算結果
    product_price DECIMAL(10,2),
    shipping DECIMAL(8,2),
    handling DECIMAL(8,2),
    total_revenue DECIMAL(10,2),
    profit_usd_no_refund DECIMAL(10,2),
    profit_usd_with_refund DECIMAL(10,2),
    profit_jpy_no_refund DECIMAL(10,2),
    profit_jpy_with_refund DECIMAL(10,2),
    profit_margin DECIMAL(5,4),
    refund_amount DECIMAL(10,2),
    
    success BOOLEAN,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- インデックス作成
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hs_codes_category ON hs_codes(category);
CREATE INDEX IF NOT EXISTS idx_ebay_mapping_category_id ON ebay_category_hs_mapping(ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_mapping_hs_code ON ebay_category_hs_mapping(hs_code);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_country ON shipping_zones(country_code);
CREATE INDEX IF NOT EXISTS idx_calculation_history_user ON calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calculation_history_date ON calculation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(created_at DESC);

-- ============================================
-- ビュー: 最新為替レート
-- ============================================
CREATE OR REPLACE VIEW latest_exchange_rate AS
SELECT 
    spot_rate,
    buffer_percent,
    safe_rate,
    source,
    created_at
FROM exchange_rates
WHERE currency_from = 'JPY' AND currency_to = 'USD'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- トリガー: updated_at自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hs_codes_updated_at BEFORE UPDATE ON hs_codes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_mapping_updated_at BEFORE UPDATE ON ebay_category_hs_mapping 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_fees_updated_at BEFORE UPDATE ON ebay_category_fees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_policies_updated_at BEFORE UPDATE ON shipping_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profit_margins_updated_at BEFORE UPDATE ON profit_margin_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_origin_countries_updated_at BEFORE UPDATE ON origin_countries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) 設定
-- ============================================
ALTER TABLE hs_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_category_hs_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_category_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_margin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全ユーザー）
CREATE POLICY "Allow public read access" ON hs_codes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON ebay_category_hs_mapping FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON ebay_category_fees FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON shipping_policies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON shipping_zones FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON profit_margin_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON origin_countries FOR SELECT USING (true);

-- 計算履歴は自分のもののみ閲覧可能
CREATE POLICY "Users can view own history" ON calculation_history 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON calculation_history 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理者のみ編集可能（後で設定）
-- CREATE POLICY "Admins can update all" ON ... FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

COMMENT ON TABLE hs_codes IS 'HSコードマスタ - 商品の関税分類コード';
COMMENT ON TABLE ebay_category_hs_mapping IS 'eBayカテゴリとHSコードのマッピング';
COMMENT ON TABLE ebay_category_fees IS 'eBayカテゴリ別手数料設定';
COMMENT ON TABLE shipping_policies IS '配送ポリシー（重量・価格帯別）';
COMMENT ON TABLE shipping_zones IS '配送ゾーン料金（国別）';
COMMENT ON TABLE profit_margin_settings IS '利益率設定（カテゴリ・国・条件別）';
COMMENT ON TABLE exchange_rates IS '為替レート履歴';
COMMENT ON TABLE origin_countries IS '原産国マスタ';
COMMENT ON TABLE calculation_history IS '価格計算履歴';
