-- ===================================
-- 配送ポリシー管理 - 完全版スキーマ
-- Supabaseで実行してください
-- ===================================

-- 1. メインテーブル: ebay_fulfillment_policies
CREATE TABLE IF NOT EXISTS public.ebay_fulfillment_policies (
  id BIGSERIAL PRIMARY KEY,
  
  -- 基本情報
  policy_name VARCHAR(255) NOT NULL,
  description TEXT,
  ebay_policy_id VARCHAR(100),
  
  -- 重量カテゴリ
  weight_category VARCHAR(50),
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
  synced_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 国別配送設定
CREATE TABLE IF NOT EXISTS public.ebay_country_shipping_settings (
  id BIGSERIAL PRIMARY KEY,
  policy_id BIGINT REFERENCES public.ebay_fulfillment_policies(id) ON DELETE CASCADE,
  
  -- 国情報
  country_code VARCHAR(2) NOT NULL,
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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(policy_id, country_code)
);

-- 3. 除外国マスター
CREATE TABLE IF NOT EXISTS public.shipping_excluded_countries (
  id BIGSERIAL PRIMARY KEY,
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(100),
  exclusion_type VARCHAR(50),
  reason TEXT,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_fulfillment_policies_active 
  ON public.ebay_fulfillment_policies(is_active);

CREATE INDEX IF NOT EXISTS idx_country_settings_policy 
  ON public.ebay_country_shipping_settings(policy_id);

CREATE INDEX IF NOT EXISTS idx_country_settings_country 
  ON public.ebay_country_shipping_settings(country_code);

CREATE INDEX IF NOT EXISTS idx_country_settings_excluded 
  ON public.ebay_country_shipping_settings(is_excluded);

CREATE INDEX IF NOT EXISTS idx_excluded_countries_code 
  ON public.shipping_excluded_countries(country_code);

-- 5. RLS (Row Level Security) 有効化
ALTER TABLE public.ebay_fulfillment_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_country_shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_excluded_countries ENABLE ROW LEVEL SECURITY;

-- 6. RLS ポリシー（全ユーザーが読み書き可能）
CREATE POLICY "Enable all access for authenticated users" 
  ON public.ebay_fulfillment_policies 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" 
  ON public.ebay_country_shipping_settings 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" 
  ON public.shipping_excluded_countries 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 7. 初期データ: 除外国
INSERT INTO public.shipping_excluded_countries (country_code, country_name, exclusion_type, reason, is_permanent) VALUES
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

-- 8. コメント追加
COMMENT ON TABLE public.ebay_fulfillment_policies IS 'eBay配送ポリシーマスター';
COMMENT ON TABLE public.ebay_country_shipping_settings IS '国別配送設定（189カ国対応）';
COMMENT ON TABLE public.shipping_excluded_countries IS '除外国マスター';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ テーブル作成完了！';
  RAISE NOTICE '📊 作成されたテーブル:';
  RAISE NOTICE '  - ebay_fulfillment_policies';
  RAISE NOTICE '  - ebay_country_shipping_settings';
  RAISE NOTICE '  - shipping_excluded_countries';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 配送ポリシー自動生成システムの準備完了！';
END $$;
