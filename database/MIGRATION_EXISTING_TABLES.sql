-- ========================================
-- 配送ポリシー管理 - 既存テーブル活用版
-- 既存のshipping_country_zones等を活用
-- ========================================

-- 1. ebay_fulfillment_policies テーブル作成
CREATE TABLE IF NOT EXISTS public.ebay_fulfillment_policies (
  id BIGSERIAL PRIMARY KEY,
  policy_name VARCHAR(255) NOT NULL,
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
  ebay_policy_id VARCHAR(100),
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ebay_country_shipping_settings テーブル作成
CREATE TABLE IF NOT EXISTS public.ebay_country_shipping_settings (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT NOT NULL REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
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
  CONSTRAINT unique_policy_country UNIQUE(policy_id, country_code)
);

-- 3. shipping_excluded_countries テーブル作成
CREATE TABLE IF NOT EXISTS public.shipping_excluded_countries (
  id BIGSERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL UNIQUE,
  country_name VARCHAR(100),
  exclusion_type VARCHAR(50),
  reason TEXT,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_policies_active ON public.ebay_fulfillment_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_country_settings_policy ON public.ebay_country_shipping_settings(policy_id);
CREATE INDEX IF NOT EXISTS idx_country_settings_country ON public.ebay_country_shipping_settings(country_code);
CREATE INDEX IF NOT EXISTS idx_country_settings_zone ON public.ebay_country_shipping_settings(zone_code);

-- 5. 初期データ: 除外国（制裁国・APO/FPO）
INSERT INTO public.shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent)
VALUES
  ('KP', 'North Korea', 'SANCTIONS', '国際制裁対象国', true),
  ('SY', 'Syria', 'CONFLICT', '紛争地域・制裁対象', true),
  ('IR', 'Iran', 'SANCTIONS', '米国制裁対象', true),
  ('CU', 'Cuba', 'SANCTIONS', '米国制裁対象', true),
  ('SD', 'Sudan', 'SANCTIONS', '制裁対象', true),
  ('SS', 'South Sudan', 'CONFLICT', '紛争地域', true),
  ('AA', 'APO/FPO Americas', 'POSTAL_RESTRICTIONS', 'APO/FPO除外', false),
  ('AE', 'APO/FPO Europe', 'POSTAL_RESTRICTIONS', 'APO/FPO除外', false),
  ('AP', 'APO/FPO Pacific', 'POSTAL_RESTRICTIONS', 'APO/FPO除外', false)
ON CONFLICT (country_code) DO NOTHING;

-- 6. テーブルコメント
COMMENT ON TABLE public.ebay_fulfillment_policies IS 'eBay配送ポリシーマスター（重量カテゴリ別）';
COMMENT ON TABLE public.ebay_country_shipping_settings IS '国別配送設定（既存shipping_country_zonesと連携）';
COMMENT ON TABLE public.shipping_excluded_countries IS '除外国マスター（制裁国・APO/FPO）';

-- 7. 確認クエリ
SELECT 
  'ebay_fulfillment_policies' as table_name,
  COUNT(*) as record_count
FROM public.ebay_fulfillment_policies
UNION ALL
SELECT 
  'ebay_country_shipping_settings',
  COUNT(*)
FROM public.ebay_country_shipping_settings
UNION ALL
SELECT 
  'shipping_excluded_countries',
  COUNT(*)
FROM public.shipping_excluded_countries;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ マイグレーション完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたテーブル:';
  RAISE NOTICE '  1. ebay_fulfillment_policies';
  RAISE NOTICE '  2. ebay_country_shipping_settings';
  RAISE NOTICE '  3. shipping_excluded_countries';
  RAISE NOTICE '';
  RAISE NOTICE '初期データ:';
  RAISE NOTICE '  - 除外国: 9件';
  RAISE NOTICE '';
  RAISE NOTICE '既存テーブルとの連携:';
  RAISE NOTICE '  - shipping_country_zones (国リスト)';
  RAISE NOTICE '  - shipping_zones (Zoneマスター)';
  RAISE NOTICE '  - shipping_rates (送料マトリックス)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 準備完了！配送ポリシー自動生成が使えます';
  RAISE NOTICE '';
END $$;
