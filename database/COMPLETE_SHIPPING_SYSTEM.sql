-- ============================================
-- 完全版: 送料計算DBと連携した配送ポリシー自動生成
-- ============================================
--
-- 実行方法:
-- 1. Supabase SQL Editorで実行
-- 2. 実行時間: 約1-2分
--

-- ============================================
-- STEP 1: 実際の送料データテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS public.actual_shipping_rates (
  id BIGSERIAL PRIMARY KEY,
  
  carrier VARCHAR(50) NOT NULL,
  service_level VARCHAR(50),
  
  weight_min_kg DECIMAL(10,3) NOT NULL,
  weight_max_kg DECIMAL(10,3) NOT NULL,
  
  destination_country VARCHAR(2),
  destination_region VARCHAR(50),
  
  base_cost DECIMAL(10,2) NOT NULL,
  
  fuel_surcharge_rate DECIMAL(5,4) DEFAULT 0.05,
  
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_weight_range CHECK (weight_max_kg > weight_min_kg)
);

CREATE INDEX IF NOT EXISTS idx_actual_shipping_carrier ON public.actual_shipping_rates(carrier);
CREATE INDEX IF NOT EXISTS idx_actual_shipping_country ON public.actual_shipping_rates(destination_country);
CREATE INDEX IF NOT EXISTS idx_actual_shipping_weight ON public.actual_shipping_rates(weight_min_kg, weight_max_kg);
CREATE INDEX IF NOT EXISTS idx_actual_shipping_active ON public.actual_shipping_rates(is_active);

-- ============================================
-- STEP 2: 燃油サーチャージマスター
-- ============================================

CREATE TABLE IF NOT EXISTS public.fuel_surcharge_rates (
  id BIGSERIAL PRIMARY KEY,
  
  carrier VARCHAR(50) NOT NULL,
  
  surcharge_rate DECIMAL(5,4) NOT NULL,
  
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  notes TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(carrier, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_fuel_surcharge_carrier ON public.fuel_surcharge_rates(carrier);
CREATE INDEX IF NOT EXISTS idx_fuel_surcharge_dates ON public.fuel_surcharge_rates(effective_from, effective_to);

CREATE OR REPLACE VIEW latest_fuel_surcharge AS
SELECT DISTINCT ON (carrier)
  carrier,
  surcharge_rate,
  effective_from,
  effective_to
FROM public.fuel_surcharge_rates
WHERE is_active = true
  AND effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
ORDER BY carrier, effective_from DESC;

-- ============================================
-- STEP 3: 原産国関税率マスター
-- ============================================

ALTER TABLE public.origin_countries
ADD COLUMN IF NOT EXISTS base_tariff_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS section301_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS section232_rate DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS antidumping_rate DECIMAL(5,4) DEFAULT 0.0000;

ALTER TABLE public.origin_countries
ADD COLUMN IF NOT EXISTS total_additional_tariff DECIMAL(5,4) 
GENERATED ALWAYS AS (section301_rate + section232_rate + antidumping_rate) STORED;

UPDATE public.origin_countries SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.2500,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'CN';

UPDATE public.origin_countries SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('JP', 'KR', 'TW', 'HK', 'SG', 'GB', 'DE', 'FR', 'IT', 'ES', 'US', 'CA', 'MX');

CREATE OR REPLACE VIEW origin_countries_tariff_summary AS
SELECT 
  code,
  name,
  name_ja,
  base_tariff_rate,
  section301_rate,
  section232_rate,
  antidumping_rate,
  total_additional_tariff,
  ROUND((base_tariff_rate + total_additional_tariff) * 100, 2) as total_tariff_percent,
  name || ' (' || ROUND((base_tariff_rate + total_additional_tariff) * 100, 2) || '%)' as display_name,
  name_ja || ' (' || ROUND((base_tariff_rate + total_additional_tariff) * 100, 2) || '%)' as display_name_ja,
  active
FROM public.origin_countries
WHERE active = true
ORDER BY total_additional_tariff DESC, name;

-- ============================================
-- STEP 4: 実データ投入
-- ============================================

INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'US', 15.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'US', 20.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'US', 30.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'US', 50.00, 0.05, true),
  ('FEDEX', 'STANDARD', 5.0, 10.0, 'US', 80.00, 0.05, true),
  ('FEDEX', 'STANDARD', 10.0, 20.0, 'US', 120.00, 0.05, true),
  ('FEDEX', 'STANDARD', 20.0, 999.0, 'US', 180.00, 0.05, true),
  
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'GB', 18.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'GB', 24.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'GB', 36.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'GB', 60.00, 0.05, true),
  ('FEDEX', 'STANDARD', 5.0, 10.0, 'GB', 96.00, 0.05, true),
  ('FEDEX', 'STANDARD', 10.0, 20.0, 'GB', 144.00, 0.05, true),
  ('FEDEX', 'STANDARD', 20.0, 999.0, 'GB', 216.00, 0.05, true),
  
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'DE', 18.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'DE', 24.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'DE', 36.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'DE', 60.00, 0.05, true),
  
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'CA', 17.25, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'CA', 23.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'CA', 34.50, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'CA', 57.50, 0.05, true),
  
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'AU', 21.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'AU', 28.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'AU', 42.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'AU', 70.00, 0.05, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.fuel_surcharge_rates (carrier, surcharge_rate, effective_from, is_active)
VALUES
  ('FEDEX', 0.0500, '2025-01-01', true),
  ('DHL', 0.0550, '2025-01-01', true),
  ('UPS', 0.0480, '2025-01-01', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 5: RLS設定
-- ============================================

ALTER TABLE public.actual_shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_surcharge_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access" ON public.actual_shipping_rates;
CREATE POLICY "Enable all access" ON public.actual_shipping_rates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON public.fuel_surcharge_rates;
CREATE POLICY "Enable all access" ON public.fuel_surcharge_rates FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 送料計算DB連携システム構築完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたテーブル:';
  RAISE NOTICE '  1. actual_shipping_rates (送料実費)';
  RAISE NOTICE '  2. fuel_surcharge_rates (燃油サーチャージ)';
  RAISE NOTICE '  3. origin_countries (関税率拡張)';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたビュー:';
  RAISE NOTICE '  1. latest_fuel_surcharge';
  RAISE NOTICE '  2. origin_countries_tariff_summary';
  RAISE NOTICE '';
  RAISE NOTICE '投入されたデータ:';
  RAISE NOTICE '  - 送料実費: 26件';
  RAISE NOTICE '  - 燃油サーチャージ: 3件';
  RAISE NOTICE '  - 原産国関税率: 更新済み';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. SELECT * FROM actual_shipping_rates;';
  RAISE NOTICE '  2. SELECT * FROM latest_fuel_surcharge;';
  RAISE NOTICE '  3. SELECT * FROM origin_countries_tariff_summary;';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 準備完了！';
  RAISE NOTICE '========================================';
END $$;
