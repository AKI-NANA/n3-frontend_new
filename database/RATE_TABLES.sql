-- 地域別料金テーブル（Rate Tables）
CREATE TABLE IF NOT EXISTS public.shipping_rate_tables (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES public.ebay_shipping_services(id) ON DELETE CASCADE,
  
  -- 地域または国
  region_code VARCHAR(50), -- 'ASIA', 'EUROPE', etc
  country_code VARCHAR(2), -- 'US', 'JP', etc (国別指定の場合)
  
  -- 料金
  shipping_cost DECIMAL(10,2) NOT NULL,
  additional_item_cost DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- 重量範囲（オプション）
  weight_min_kg DECIMAL(10,3),
  weight_max_kg DECIMAL(10,3),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 地域または国のどちらか1つを指定
  CONSTRAINT check_region_or_country CHECK (
    (region_code IS NOT NULL AND country_code IS NULL) OR
    (region_code IS NULL AND country_code IS NOT NULL)
  )
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_rate_tables_policy ON public.shipping_rate_tables(policy_id);
CREATE INDEX IF NOT EXISTS idx_rate_tables_service ON public.shipping_rate_tables(service_id);
CREATE INDEX IF NOT EXISTS idx_rate_tables_region ON public.shipping_rate_tables(region_code);
CREATE INDEX IF NOT EXISTS idx_rate_tables_country ON public.shipping_rate_tables(country_code);

-- RLS
ALTER TABLE public.shipping_rate_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access" ON public.shipping_rate_tables FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.shipping_rate_tables IS 'eBay Shipping Rate Tables - 地域/国別料金設定';
