-- eBay Fulfillment Policy API準拠のスキーマ

-- 1. Fulfillment Policyメインテーブル
CREATE TABLE IF NOT EXISTS public.ebay_fulfillment_policies (
  id BIGSERIAL PRIMARY KEY,
  
  -- 基本情報
  name VARCHAR(255) NOT NULL,
  description TEXT,
  marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
  category_types TEXT[], -- ['ALL_EXCLUDING_MOTORS_VEHICLES']
  
  -- eBay API情報
  ebay_fulfillment_policy_id VARCHAR(100),
  
  -- ハンドリング設定
  handling_time_value INTEGER DEFAULT 10,
  handling_time_unit VARCHAR(20) DEFAULT 'BUSINESS_DAY',
  
  -- 配送オプション
  ship_to_locations TEXT[], -- ['WORLDWIDE'] または国コードリスト
  global_shipping BOOLEAN DEFAULT false,
  pickup_drop_off BOOLEAN DEFAULT false,
  freight_shipping BOOLEAN DEFAULT false,
  
  -- ステータス
  is_active BOOLEAN DEFAULT true,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 2. 配送サービス（ShippingService）
CREATE TABLE IF NOT EXISTS public.ebay_shipping_services (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  
  -- サービス基本情報
  service_type VARCHAR(20) NOT NULL, -- 'DOMESTIC' or 'INTERNATIONAL'
  shipping_carrier_code VARCHAR(50), -- 'USPS', 'FedEx', 'UPS', etc
  shipping_service_code VARCHAR(100), -- 'USPSPriorityFlatRateBox', 'FedExInternationalEconomy', etc
  
  -- 料金設定
  free_shipping BOOLEAN DEFAULT false,
  shipping_cost_value DECIMAL(10,2),
  shipping_cost_currency VARCHAR(3) DEFAULT 'USD',
  additional_shipping_cost_value DECIMAL(10,2) DEFAULT 0,
  additional_shipping_cost_currency VARCHAR(3) DEFAULT 'USD',
  
  -- 配送時間
  min_transit_time_value INTEGER,
  min_transit_time_unit VARCHAR(20), -- 'BUSINESS_DAY', 'DAY', 'HOUR'
  max_transit_time_value INTEGER,
  max_transit_time_unit VARCHAR(20),
  
  -- 配送先（国際配送用）
  ship_to_locations TEXT[], -- ['WORLDWIDE'] または国コードリスト ['US', 'CA', 'GB']
  
  -- 優先度
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 除外国・地域（Exclusion List）
CREATE TABLE IF NOT EXISTS public.ebay_shipping_exclusions (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  
  -- 除外する場所
  exclude_ship_to_location VARCHAR(2) NOT NULL, -- 国コード 'KP', 'SY', etc
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(policy_id, exclude_ship_to_location)
);

-- 4. 料金表（Rate Table）- オプション
CREATE TABLE IF NOT EXISTS public.ebay_rate_tables (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  
  rate_table_id VARCHAR(100), -- eBay API rate table ID
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_policies_marketplace ON public.ebay_fulfillment_policies(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_policies_active ON public.ebay_fulfillment_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_services_policy ON public.ebay_shipping_services(policy_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON public.ebay_shipping_services(service_type);
CREATE INDEX IF NOT EXISTS idx_exclusions_policy ON public.ebay_shipping_exclusions(policy_id);

-- RLS有効化
ALTER TABLE public.ebay_fulfillment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_shipping_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_shipping_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_rate_tables ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Enable all access" ON public.ebay_fulfillment_policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.ebay_shipping_services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.ebay_shipping_exclusions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON public.ebay_rate_tables FOR ALL USING (true) WITH CHECK (true);

-- コメント
COMMENT ON TABLE public.ebay_fulfillment_policies IS 'eBay Fulfillment Policy API準拠のポリシーマスター';
COMMENT ON TABLE public.ebay_shipping_services IS '配送サービス（国内・国際）';
COMMENT ON TABLE public.ebay_shipping_exclusions IS '除外国・地域リスト';

-- 既存の不要なテーブルを削除（オプション）
-- DROP TABLE IF EXISTS public.ebay_zone_shipping_rates CASCADE;
-- DROP TABLE IF EXISTS public.ebay_country_shipping_settings CASCADE;
