-- database/migrations/final_cleanup_all_policies.sql
/**
 * 古いポリシーを完全削除して、最終版のみ残す
 */

-- ========================================
-- STEP 1: 全てのポリシーを無効化
-- ========================================
UPDATE ebay_shipping_policies_v2
SET active = false;

-- ========================================
-- STEP 2: 最終版のポリシーのみ有効化
-- ========================================

-- DDP BAND_200を有効化（各重量帯で1つだけ）
WITH ddp_200_first AS (
  SELECT MIN(id) as id
  FROM ebay_shipping_policies_v2
  WHERE pricing_basis = 'DDP'
    AND price_band_final = 'BAND_200'
  GROUP BY weight_min_kg, weight_max_kg
)
UPDATE ebay_shipping_policies_v2 p
SET active = true
FROM ddp_200_first f
WHERE p.id = f.id;

-- DDP BAND_350を有効化（各重量帯で1つだけ）
WITH ddp_350_first AS (
  SELECT MIN(id) as id
  FROM ebay_shipping_policies_v2
  WHERE pricing_basis = 'DDP'
    AND price_band_final = 'BAND_350'
  GROUP BY weight_min_kg, weight_max_kg
)
UPDATE ebay_shipping_policies_v2 p
SET active = true
FROM ddp_350_first f
WHERE p.id = f.id;

-- DDUを有効化（各重量帯で1つだけ）
WITH ddu_first AS (
  SELECT MIN(id) as id
  FROM ebay_shipping_policies_v2
  WHERE pricing_basis = 'DDU'
    AND (price_band_final IS NULL OR price_band_final = '')
  GROUP BY weight_min_kg, weight_max_kg
)
UPDATE ebay_shipping_policies_v2 p
SET active = true
FROM ddu_first f
WHERE p.id = f.id;

-- ========================================
-- STEP 3: 古いポリシーを物理削除
-- ========================================

-- まずZONEレートを削除
DELETE FROM ebay_policy_zone_rates_v2
WHERE policy_id IN (
  SELECT id FROM ebay_shipping_policies_v2
  WHERE active = false
);

-- 次にポリシー本体を削除
DELETE FROM ebay_shipping_policies_v2
WHERE active = false;

-- ========================================
-- STEP 4: 確認
-- ========================================

SELECT 
  pricing_basis,
  price_band_final,
  CASE 
    WHEN weight_min_kg = 0.5 THEN 'Light (0.5-2kg)'
    WHEN weight_min_kg = 2.0 THEN 'Small (2-5kg)'
    WHEN weight_min_kg = 5.0 THEN 'Medium (5-10kg)'
    WHEN weight_min_kg = 10.0 THEN 'Large (10-20kg)'
  END as weight_class,
  COUNT(*) as count,
  STRING_AGG(policy_name, ', ' ORDER BY id) as names
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_final, weight_min_kg
ORDER BY 
  pricing_basis DESC,
  price_band_final NULLS LAST,
  weight_min_kg;

-- 詳細リスト
SELECT 
  id,
  policy_name,
  pricing_basis,
  price_band_final,
  sample_product_price,
  weight_min_kg || '-' || weight_max_kg as weight,
  active
FROM ebay_shipping_policies_v2
WHERE active = true
ORDER BY 
  pricing_basis DESC,
  price_band_final NULLS LAST,
  weight_min_kg;

-- USA送料確認
SELECT 
  p.id,
  p.policy_name,
  p.pricing_basis,
  p.price_band_final,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.first_item_shipping_usd, 2) as first,
  ROUND(r.additional_item_shipping_usd, 2) as additional,
  ROUND(r.handling_fee_usd, 2) as handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code = 'US'
ORDER BY 
  p.pricing_basis DESC,
  p.price_band_final NULLS LAST,
  p.weight_min_kg;

DO $$
DECLARE
  total_active INTEGER;
  total_ddp INTEGER;
  total_ddu INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_active FROM ebay_shipping_policies_v2 WHERE active = true;
  SELECT COUNT(*) INTO total_ddp FROM ebay_shipping_policies_v2 WHERE active = true AND pricing_basis = 'DDP';
  SELECT COUNT(*) INTO total_ddu FROM ebay_shipping_policies_v2 WHERE active = true AND pricing_basis = 'DDU';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ポリシー整理完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '合計: % ポリシー', total_active;
  RAISE NOTICE 'DDP: % (BAND_200: 4, BAND_350: 4)', total_ddp;
  RAISE NOTICE 'DDU: % (4重量帯)', total_ddu;
  RAISE NOTICE '========================================';
END $$;
