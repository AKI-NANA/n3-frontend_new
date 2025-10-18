-- ===================================
-- 既存のshipping_country_zonesテーブルを使う場合
-- (既に189カ国のデータがある場合)
-- ===================================

-- この場合は、ebay_fulfillment_policies と shipping_excluded_countries のみ作成すればOK

CREATE TABLE IF NOT EXISTS public.ebay_fulfillment_policies (
  id BIGSERIAL PRIMARY KEY,
  policy_name VARCHAR(255) NOT NULL,
  description TEXT,
  weight_category VARCHAR(50),
  weight_min_kg DECIMAL(10,3),
  weight_max_kg DECIMAL(10,3),
  marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
  category_type VARCHAR(100) DEFAULT 'ALL_EXCLUDING_MOTORS_VEHICLES',
  handling_time_days INTEGER DEFAULT 10,
  local_pickup BOOLEAN DEFAULT false,
  freight_shipping BOOLEAN DEFAULT false,
  global_shipping BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_excluded_countries (
  id BIGSERIAL PRIMARY KEY,
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(100),
  exclusion_type VARCHAR(50),
  reason TEXT,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS設定
ALTER TABLE public.ebay_fulfillment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_excluded_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.ebay_fulfillment_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.shipping_excluded_countries FOR ALL USING (true) WITH CHECK (true);

-- 除外国データ
INSERT INTO public.shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent) VALUES
('KP', 'North Korea', 'SANCTIONS', '国際制裁対象国', true),
('SY', 'Syria', 'CONFLICT', '紛争地域', true),
('IR', 'Iran', 'SANCTIONS', '米国制裁対象', true),
('CU', 'Cuba', 'SANCTIONS', '米国制裁対象', true),
('SD', 'Sudan', 'SANCTIONS', '制裁対象', true),
('SS', 'South Sudan', 'CONFLICT', '紛争地域', true),
('AA', 'APO/FPO Americas', 'POSTAL_RESTRICTIONS', 'APO/FPO', false),
('AE', 'APO/FPO Europe', 'POSTAL_RESTRICTIONS', 'APO/FPO', false),
('AP', 'APO/FPO Pacific', 'POSTAL_RESTRICTIONS', 'APO/FPO', false)
ON CONFLICT (country_code) DO NOTHING;

-- ebay_country_shipping_settingsも作成（後で使う）
CREATE TABLE IF NOT EXISTS public.ebay_country_shipping_settings (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100),
  zone_code VARCHAR(20),
  shipping_cost DECIMAL(10,2),
  handling_fee DECIMAL(10,2),
  express_available BOOLEAN DEFAULT true,
  standard_available BOOLEAN DEFAULT true,
  economy_available BOOLEAN DEFAULT false,
  is_ddp BOOLEAN DEFAULT false,
  estimated_tariff DECIMAL(10,2),
  is_excluded BOOLEAN DEFAULT false,
  exclusion_reason VARCHAR(255),
  calculated_margin DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(policy_id, country_code)
);

ALTER TABLE public.ebay_country_shipping_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access" ON public.ebay_country_shipping_settings FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_country_settings_policy ON public.ebay_country_shipping_settings(policy_id);
CREATE INDEX IF NOT EXISTS idx_country_settings_country ON public.ebay_country_shipping_settings(country_code);
