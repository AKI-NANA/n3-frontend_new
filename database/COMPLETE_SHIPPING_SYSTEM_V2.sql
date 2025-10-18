-- ============================================
-- 送料計算DB構築 - Supabase対応版
-- ============================================
-- 
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor
-- 2. このSQL全体をコピー＆ペースト
-- 3. RUN をクリック
--

-- ============================================
-- STEP 1: 送料実費テーブル作成
-- ============================================

DROP TABLE IF EXISTS public.actual_shipping_rates CASCADE;

CREATE TABLE public.actual_shipping_rates (
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

COMMENT ON TABLE public.actual_shipping_rates IS '実送料データ（キャリア・重量・国別）';

-- インデックス作成
CREATE INDEX idx_actual_shipping_carrier ON public.actual_shipping_rates(carrier);
CREATE INDEX idx_actual_shipping_country ON public.actual_shipping_rates(destination_country);
CREATE INDEX idx_actual_shipping_weight ON public.actual_shipping_rates(weight_min_kg, weight_max_kg);
CREATE INDEX idx_actual_shipping_active ON public.actual_shipping_rates(is_active);

-- RLS有効化
ALTER TABLE public.actual_shipping_rates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（全員アクセス可能）
CREATE POLICY "Allow all access to actual_shipping_rates" 
ON public.actual_shipping_rates 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- ============================================
-- STEP 2: 燃油サーチャージテーブル作成
-- ============================================

DROP TABLE IF EXISTS public.fuel_surcharge_rates CASCADE;

CREATE TABLE public.fuel_surcharge_rates (
  id BIGSERIAL PRIMARY KEY,
  carrier VARCHAR(50) NOT NULL,
  surcharge_rate DECIMAL(5,4) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_carrier_date UNIQUE(carrier, effective_from)
);

COMMENT ON TABLE public.fuel_surcharge_rates IS '燃油サーチャージ（変動データ）';

-- インデックス作成
CREATE INDEX idx_fuel_surcharge_carrier ON public.fuel_surcharge_rates(carrier);
CREATE INDEX idx_fuel_surcharge_dates ON public.fuel_surcharge_rates(effective_from, effective_to);

-- RLS有効化
ALTER TABLE public.fuel_surcharge_rates ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Allow all access to fuel_surcharge_rates" 
ON public.fuel_surcharge_rates 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- 最新サーチャージビュー
DROP VIEW IF EXISTS public.latest_fuel_surcharge CASCADE;

CREATE VIEW public.latest_fuel_surcharge AS
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
-- STEP 3: 原産国テーブル拡張
-- ============================================

-- カラム追加（既存の場合はスキップ）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'origin_countries' 
                 AND column_name = 'base_tariff_rate') THEN
    ALTER TABLE public.origin_countries ADD COLUMN base_tariff_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'origin_countries' 
                 AND column_name = 'section301_rate') THEN
    ALTER TABLE public.origin_countries ADD COLUMN section301_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'origin_countries' 
                 AND column_name = 'section232_rate') THEN
    ALTER TABLE public.origin_countries ADD COLUMN section232_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'origin_countries' 
                 AND column_name = 'antidumping_rate') THEN
    ALTER TABLE public.origin_countries ADD COLUMN antidumping_rate DECIMAL(5,4) DEFAULT 0.0000;
  END IF;
END $$;

-- 合計関税率カラム（計算カラムはPostgreSQL 12+のみ対応）
-- Supabaseは通常PostgreSQL 15なので問題なし
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'origin_countries' 
                 AND column_name = 'total_additional_tariff') THEN
    ALTER TABLE public.origin_countries 
    ADD COLUMN total_additional_tariff DECIMAL(5,4) 
    GENERATED ALWAYS AS (section301_rate + section232_rate + antidumping_rate) STORED;
  END IF;
END $$;

-- 中国の関税率設定
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.2500,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code = 'CN';

-- その他主要国の関税率設定
UPDATE public.origin_countries 
SET 
  base_tariff_rate = 0.0000,
  section301_rate = 0.0000,
  section232_rate = 0.0000,
  antidumping_rate = 0.0000
WHERE code IN ('JP', 'KR', 'TW', 'HK', 'SG', 'GB', 'DE', 'FR', 'IT', 'ES', 'US', 'CA', 'MX', 'AU', 'NZ');

-- 原産国サマリービュー
DROP VIEW IF EXISTS public.origin_countries_tariff_summary CASCADE;

CREATE VIEW public.origin_countries_tariff_summary AS
SELECT 
  code,
  name,
  name_ja,
  base_tariff_rate,
  section301_rate,
  section232_rate,
  antidumping_rate,
  COALESCE(total_additional_tariff, 0) as total_additional_tariff,
  ROUND((COALESCE(base_tariff_rate, 0) + COALESCE(total_additional_tariff, 0)) * 100, 2) as total_tariff_percent,
  name || ' (' || ROUND((COALESCE(base_tariff_rate, 0) + COALESCE(total_additional_tariff, 0)) * 100, 2) || '%)' as display_name,
  COALESCE(name_ja, name) || ' (' || ROUND((COALESCE(base_tariff_rate, 0) + COALESCE(total_additional_tariff, 0)) * 100, 2) || '%)' as display_name_ja,
  active
FROM public.origin_countries
WHERE active = true
ORDER BY total_additional_tariff DESC, name;

-- ============================================
-- STEP 4: サンプルデータ投入
-- ============================================

-- 送料実費データ（USA）
INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'US', 15.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'US', 20.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'US', 30.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'US', 50.00, 0.05, true),
  ('FEDEX', 'STANDARD', 5.0, 10.0, 'US', 80.00, 0.05, true),
  ('FEDEX', 'STANDARD', 10.0, 20.0, 'US', 120.00, 0.05, true),
  ('FEDEX', 'STANDARD', 20.0, 999.0, 'US', 180.00, 0.05, true)
ON CONFLICT DO NOTHING;

-- 送料実費データ（UK）
INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'GB', 18.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'GB', 24.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'GB', 36.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'GB', 60.00, 0.05, true),
  ('FEDEX', 'STANDARD', 5.0, 10.0, 'GB', 96.00, 0.05, true),
  ('FEDEX', 'STANDARD', 10.0, 20.0, 'GB', 144.00, 0.05, true),
  ('FEDEX', 'STANDARD', 20.0, 999.0, 'GB', 216.00, 0.05, true)
ON CONFLICT DO NOTHING;

-- 送料実費データ（Germany）
INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'DE', 18.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'DE', 24.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'DE', 36.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'DE', 60.00, 0.05, true)
ON CONFLICT DO NOTHING;

-- 送料実費データ（Canada）
INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'CA', 17.25, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'CA', 23.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'CA', 34.50, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'CA', 57.50, 0.05, true)
ON CONFLICT DO NOTHING;

-- 送料実費データ（Australia）
INSERT INTO public.actual_shipping_rates 
  (carrier, service_level, weight_min_kg, weight_max_kg, destination_country, base_cost, fuel_surcharge_rate, is_active)
VALUES
  ('FEDEX', 'STANDARD', 0.0, 0.5, 'AU', 21.00, 0.05, true),
  ('FEDEX', 'STANDARD', 0.5, 1.0, 'AU', 28.00, 0.05, true),
  ('FEDEX', 'STANDARD', 1.0, 2.0, 'AU', 42.00, 0.05, true),
  ('FEDEX', 'STANDARD', 2.0, 5.0, 'AU', 70.00, 0.05, true)
ON CONFLICT DO NOTHING;

-- 燃油サーチャージデータ
INSERT INTO public.fuel_surcharge_rates (carrier, surcharge_rate, effective_from, is_active, notes)
VALUES
  ('FEDEX', 0.0500, '2025-01-01', true, '2025年1月現在の燃油サーチャージ'),
  ('DHL', 0.0550, '2025-01-01', true, '2025年1月現在の燃油サーチャージ'),
  ('UPS', 0.0480, '2025-01-01', true, '2025年1月現在の燃油サーチャージ')
ON CONFLICT (carrier, effective_from) DO NOTHING;

-- ============================================
-- STEP 5: データ確認
-- ============================================

DO $$
DECLARE
  shipping_count INTEGER;
  fuel_count INTEGER;
  country_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO shipping_count FROM public.actual_shipping_rates;
  SELECT COUNT(*) INTO fuel_count FROM public.fuel_surcharge_rates;
  SELECT COUNT(*) INTO country_count FROM public.origin_countries WHERE active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 送料計算DB構築完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたテーブル:';
  RAISE NOTICE '  1. actual_shipping_rates: % 件', shipping_count;
  RAISE NOTICE '  2. fuel_surcharge_rates: % 件', fuel_count;
  RAISE NOTICE '  3. origin_countries: % 件（拡張済み）', country_count;
  RAISE NOTICE '';
  RAISE NOTICE '作成されたビュー:';
  RAISE NOTICE '  1. latest_fuel_surcharge';
  RAISE NOTICE '  2. origin_countries_tariff_summary';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  SELECT * FROM actual_shipping_rates;';
  RAISE NOTICE '  SELECT * FROM latest_fuel_surcharge;';
  RAISE NOTICE '  SELECT * FROM origin_countries_tariff_summary LIMIT 10;';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 準備完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
