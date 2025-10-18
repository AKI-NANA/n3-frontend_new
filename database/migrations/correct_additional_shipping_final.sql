-- database/migrations/correct_additional_shipping_final.sql
/**
 * 2個目以降の送料を正しく計算（修正版）
 * 
 * 【重要な修正】
 * 2個目の送料 = 実費 + (2個時のDDP総額 - 1個時のDDP総額)
 * 
 * これまでの間違い: 手数料を二重に計算していた
 */

-- ========================================
-- STEP 1: カラムを追加（まだなければ）
-- ========================================
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS first_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2);

ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS price_band_final VARCHAR(20);

-- ========================================
-- STEP 2: 1個目の送料を設定
-- ========================================
UPDATE ebay_policy_zone_rates_v2
SET first_item_shipping_usd = display_shipping_usd
WHERE first_item_shipping_usd IS NULL;

-- ========================================
-- STEP 3: DDPの価格帯を設定
-- ========================================
UPDATE ebay_shipping_policies_v2
SET 
  price_band_final = 'BAND_200',
  sample_product_price = 200,
  price_min_usd = 150,
  price_max_usd = 250
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 200;

UPDATE ebay_shipping_policies_v2
SET 
  price_band_final = 'BAND_350',
  sample_product_price = 350,
  price_min_usd = 250,
  price_max_usd = 450
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 550;

UPDATE ebay_shipping_policies_v2
SET price_band_final = NULL
WHERE pricing_basis = 'DDU';

-- ========================================
-- STEP 4: 2個目の送料を正しく計算
-- ========================================

-- DDU: 実費と同額
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU';

-- DDP BAND_200: 上限$250
-- 正しい計算: 実費 + (2個のDDP総額 - 1個のDDP総額)
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + 
  (
    -- 2個時のDDP総額
    ((250 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((250 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (250 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) 
    -
    -- 1個時のDDP総額
    ((250 + r.actual_cost_usd) * 0.065 + 
     GREATEST((250 + r.actual_cost_usd) * 0.003464, 0.30) +
     (250 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_final = 'BAND_200';

-- DDP BAND_350: 上限$450
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + 
  (
    ((450 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((450 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (450 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) 
    -
    ((450 + r.actual_cost_usd) * 0.065 + 
     GREATEST((450 + r.actual_cost_usd) * 0.003464, 0.30) +
     (450 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_final = 'BAND_350';

-- ========================================
-- STEP 5: 確認クエリ
-- ========================================
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_final,
  p.sample_product_price,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.actual_cost_usd, 2) as actual,
  ROUND(r.first_item_shipping_usd, 2) as first,
  ROUND(r.additional_item_shipping_usd, 2) as additional,
  ROUND(r.handling_fee_usd, 2) as handling,
  -- 2個購入時の総送料
  ROUND(r.first_item_shipping_usd + r.additional_item_shipping_usd + r.handling_fee_usd, 2) as total_2items
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA')
ORDER BY 
  p.pricing_basis DESC,
  p.sample_product_price NULLS LAST,
  p.weight_min_kg
LIMIT 40;

COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降の追加送料（実費 + DDP総額の増加分）';

DO $$
BEGIN
  RAISE NOTICE '✅ 2個目送料を正しく計算しました';
  RAISE NOTICE '計算式: 実費 + (2個のDDP総額 - 1個のDDP総額)';
END $$;
