-- eBay配送ポリシー完全実装スキーマ
-- CPASS FedEx参照、Zone別国設定、サービスレベル対応

-- ===========================
-- 1. 配送ポリシーマスター
-- ===========================
CREATE TABLE IF NOT EXISTS ebay_shipping_policies (
  id SERIAL PRIMARY KEY,
  
  -- 基本情報
  policy_name VARCHAR(255) NOT NULL,
  description TEXT,
  ebay_policy_id VARCHAR(100), -- eBay API返却ID
  
  -- 重量カテゴリ
  weight_category VARCHAR(50), -- 'ultra_light', 'light', 'medium', etc.
  weight_min_kg DECIMAL(10,3),
  weight_max_kg DECIMAL(10,3),
  
  -- eBay設定
  marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
  category_type VARCHAR(100) DEFAULT 'ALL_EXCLUDING_MOTORS_VEHICLES',
  
  -- ハンドリング
  handling_time_days INTEGER DEFAULT 10,
  
  -- オプション
  local_pickup BOOLEAN DEFAULT false,
  freight_shipping BOOLEAN DEFAULT false,
  global_shipping BOOLEAN DEFAULT false,
  
  -- ステータス
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 2. 配送サービス定義
-- ===========================
CREATE TABLE IF NOT EXISTS ebay_shipping_services (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES ebay_shipping_policies(id) ON DELETE CASCADE,
  
  -- サービス情報
  service_level VARCHAR(50), -- 'NEXT_DAY', 'EXPEDITED', 'STANDARD', 'ECONOMY'
  service_type VARCHAR(20), -- 'DOMESTIC' or 'INTERNATIONAL'
  
  -- eBayサービスコード
  ebay_service_code VARCHAR(100),
  service_display_name VARCHAR(255),
  
  -- 配送日数
  min_delivery_days INTEGER,
  max_delivery_days INTEGER,
  
  -- コストタイプ
  cost_type VARCHAR(20) DEFAULT 'CALCULATED', -- 'FLAT' or 'CALCULATED'
  
  -- 料金表参照（オプション）
  rate_table_id INTEGER,
  
  -- 順序
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 3. Zone別配送料金
-- ===========================
CREATE TABLE IF NOT EXISTS ebay_zone_shipping_rates (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES ebay_shipping_services(id) ON DELETE CASCADE,
  
  zone_code VARCHAR(20), -- 'ZONE_1', 'ZONE_2', etc.
  zone_name VARCHAR(100),
  
  -- 重量ステップ
  weight_kg DECIMAL(10,3),
  
  -- CPASS FedEx参照料金
  reference_shipping_cost DECIMAL(10,2), -- 実際のFedEx料金
  
  -- 見かけ上の送料（eBay表示）
  display_shipping_cost DECIMAL(10,2),
  additional_item_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Handling Fee
  handling_fee DECIMAL(10,2),
  
  -- サービス利用可否
  service_available BOOLEAN DEFAULT true,
  unavailable_reason VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 4. 国別配送設定
-- ===========================
CREATE TABLE IF NOT EXISTS ebay_country_shipping_settings (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES ebay_shipping_services(id) ON DELETE CASCADE,
  
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  zone_code VARCHAR(20),
  
  -- 配送料金（Zone料金から継承）
  shipping_cost DECIMAL(10,2),
  additional_item_cost DECIMAL(10,2) DEFAULT 0,
  handling_fee DECIMAL(10,2),
  
  -- サービスレベル利用可否
  express_available BOOLEAN DEFAULT true,
  standard_available BOOLEAN DEFAULT true,
  economy_available BOOLEAN DEFAULT false, -- 多くの国でEconomyは不可
  
  -- DDP設定
  is_ddp BOOLEAN DEFAULT false,
  estimated_tariff DECIMAL(10,2),
  estimated_duties DECIMAL(10,2),
  
  -- 除外設定
  is_excluded BOOLEAN DEFAULT false,
  exclusion_reason VARCHAR(255),
  
  -- 利益率
  calculated_margin DECIMAL(5,4),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(service_id, country_code)
);

-- ===========================
-- 5. 除外国マスター
-- ===========================
CREATE TABLE IF NOT EXISTS shipping_excluded_countries (
  id SERIAL PRIMARY KEY,
  
  country_code VARCHAR(2) UNIQUE,
  country_name VARCHAR(100),
  
  -- 除外理由
  exclusion_type VARCHAR(50), -- 'SANCTIONS', 'CONFLICT', 'HIGH_RISK', 'POSTAL_RESTRICTIONS'
  reason TEXT,
  
  -- 除外レベル
  is_permanent BOOLEAN DEFAULT false, -- 恒久的除外
  is_temporary BOOLEAN DEFAULT false, -- 一時的除外
  
  -- 適用ポリシー（NULL = 全ポリシーに適用）
  applies_to_policy_id INTEGER REFERENCES ebay_shipping_policies(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 6. サービスレベル利用可否マスター
-- ===========================
CREATE TABLE IF NOT EXISTS service_availability_by_country (
  id SERIAL PRIMARY KEY,
  
  country_code VARCHAR(2),
  
  -- FedEx
  fedex_express_available BOOLEAN DEFAULT true,
  fedex_standard_available BOOLEAN DEFAULT true,
  fedex_economy_available BOOLEAN DEFAULT false,
  
  -- DHL
  dhl_express_available BOOLEAN DEFAULT true,
  dhl_economy_available BOOLEAN DEFAULT false,
  
  -- UPS
  ups_express_available BOOLEAN DEFAULT true,
  ups_standard_available BOOLEAN DEFAULT true,
  
  -- EMS（日本郵便）
  ems_available BOOLEAN DEFAULT false, -- USA: 現在不可
  
  -- 推奨キャリア
  recommended_carrier VARCHAR(50),
  
  notes TEXT,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(country_code)
);

-- ===========================
-- 7. 料金表（Rate Table）
-- ===========================
CREATE TABLE IF NOT EXISTS ebay_rate_tables (
  id SERIAL PRIMARY KEY,
  
  table_name VARCHAR(255),
  table_type VARCHAR(20), -- 'DOMESTIC' or 'INTERNATIONAL'
  package_type VARCHAR(50), -- 'PACKAGE', 'LETTER', 'LARGE_PACKAGE', 'FREIGHT'
  
  -- 重量ベース
  weight_based BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ebay_rate_table_entries (
  id SERIAL PRIMARY KEY,
  rate_table_id INTEGER REFERENCES ebay_rate_tables(id) ON DELETE CASCADE,
  
  -- 地域/国
  region_type VARCHAR(20), -- 'STATE', 'COUNTRY', 'ZONE'
  region_code VARCHAR(10),
  region_name VARCHAR(100),
  
  -- 料金
  base_cost DECIMAL(10,2),
  additional_item_cost DECIMAL(10,2) DEFAULT 0,
  
  -- 重量範囲（オプション）
  weight_min_kg DECIMAL(10,3),
  weight_max_kg DECIMAL(10,3),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- 8. 初期データ: 除外国
-- ===========================
INSERT INTO shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent) VALUES
('KP', 'North Korea', 'SANCTIONS', '国際制裁対象国', true),
('SY', 'Syria', 'CONFLICT', '紛争地域・制裁対象', true),
('IR', 'Iran', 'SANCTIONS', '米国制裁対象（一部商品）', true),
('CU', 'Cuba', 'SANCTIONS', '米国制裁対象', true),
('SD', 'Sudan', 'SANCTIONS', '制裁対象', true),
('SS', 'South Sudan', 'CONFLICT', '紛争地域', true),
('VE', 'Venezuela', 'HIGH_RISK', '政情不安定', false),
('BY', 'Belarus', 'SANCTIONS', '制裁対象（2022～）', false)
ON CONFLICT (country_code) DO NOTHING;

-- ===========================
-- 9. 初期データ: APO/FPO除外
-- ===========================
INSERT INTO shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent) VALUES
('AA', 'APO/FPO (Armed Forces Americas)', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false),
('AE', 'APO/FPO (Armed Forces Europe)', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false),
('AP', 'APO/FPO (Armed Forces Pacific)', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false)
ON CONFLICT (country_code) DO NOTHING;

-- ===========================
-- インデックス作成
-- ===========================
CREATE INDEX idx_shipping_services_policy ON ebay_shipping_services(policy_id);
CREATE INDEX idx_zone_rates_service ON ebay_zone_shipping_rates(service_id);
CREATE INDEX idx_zone_rates_zone ON ebay_zone_shipping_rates(zone_code);
CREATE INDEX idx_country_settings_service ON ebay_country_shipping_settings(service_id);
CREATE INDEX idx_country_settings_country ON ebay_country_shipping_settings(country_code);
CREATE INDEX idx_excluded_countries_code ON shipping_excluded_countries(country_code);

COMMENT ON TABLE ebay_shipping_policies IS 'eBay配送ポリシーマスター';
COMMENT ON TABLE ebay_shipping_services IS '配送サービス定義（Express/Standard/Economy）';
COMMENT ON TABLE ebay_zone_shipping_rates IS 'Zone別配送料金（CPASS FedEx参照）';
COMMENT ON TABLE ebay_country_shipping_settings IS '国別配送設定（189カ国）';
COMMENT ON TABLE shipping_excluded_countries IS '除外国マスター（制裁国・APO/FPO等）';
COMMENT ON TABLE service_availability_by_country IS '国別サービスレベル利用可否';
