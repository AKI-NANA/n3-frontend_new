-- Supabase用 簡易スキーマ（既存テーブルとの統合版）

-- 1. 配送ポリシーマスター（既存のテーブルを拡張）
-- 既にebay_fulfillment_policiesがある場合は、カラム追加のみ
ALTER TABLE ebay_fulfillment_policies 
ADD COLUMN IF NOT EXISTS weight_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS weight_min_kg DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS weight_max_kg DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS handling_time_days INTEGER DEFAULT 10;

-- 2. 国別配送設定テーブル（新規作成）
CREATE TABLE IF NOT EXISTS ebay_country_shipping_settings (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES ebay_fulfillment_policies(id) ON DELETE CASCADE,
  
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  zone_code VARCHAR(20),
  
  -- 配送料金
  shipping_cost DECIMAL(10,2),
  additional_item_cost DECIMAL(10,2) DEFAULT 0,
  handling_fee DECIMAL(10,2),
  
  -- サービスレベル利用可否
  express_available BOOLEAN DEFAULT true,
  standard_available BOOLEAN DEFAULT true,
  economy_available BOOLEAN DEFAULT false,
  
  -- DDP設定
  is_ddp BOOLEAN DEFAULT false,
  estimated_tariff DECIMAL(10,2),
  
  -- 除外設定
  is_excluded BOOLEAN DEFAULT false,
  exclusion_reason VARCHAR(255),
  
  -- 利益率
  calculated_margin DECIMAL(5,4),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(policy_id, country_code)
);

-- 3. 除外国マスター（新規作成）
CREATE TABLE IF NOT EXISTS shipping_excluded_countries (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) UNIQUE,
  country_name VARCHAR(100),
  exclusion_type VARCHAR(50),
  reason TEXT,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 初期データ: 除外国
INSERT INTO shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent) VALUES
('KP', 'North Korea', 'SANCTIONS', '国際制裁対象国', true),
('SY', 'Syria', 'CONFLICT', '紛争地域・制裁対象', true),
('IR', 'Iran', 'SANCTIONS', '米国制裁対象', true),
('CU', 'Cuba', 'SANCTIONS', '米国制裁対象', true),
('SD', 'Sudan', 'SANCTIONS', '制裁対象', true),
('SS', 'South Sudan', 'CONFLICT', '紛争地域', true),
('AA', 'APO/FPO Americas', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false),
('AE', 'APO/FPO Europe', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false),
('AP', 'APO/FPO Pacific', 'POSTAL_RESTRICTIONS', 'eBay推奨除外', false)
ON CONFLICT (country_code) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_country_settings_policy ON ebay_country_shipping_settings(policy_id);
CREATE INDEX IF NOT EXISTS idx_country_settings_country ON ebay_country_shipping_settings(country_code);
CREATE INDEX IF NOT EXISTS idx_excluded_countries_code ON shipping_excluded_countries(country_code);
