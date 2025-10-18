-- database/migrations/correct_ddp_ddu_boundary.sql
/**
 * DDP/DDUの境界を修正
 * 
 * 【決定】
 * DDP: $100-550 (3つの価格帯)
 * DDU: $550+ および全てのOTHER国
 * 
 * 理由: 
 * - $550超の商品でDDP送料は顧客体験が悪い
 * - 高額商品は顧客もDDU（着払い）を期待
 */

-- ========================================
-- STEP 1: $550超のDDPポリシーをDDUに変更
-- ========================================

-- $550超の商品はDDUに切り替え
UPDATE ebay_shipping_policies_v2
SET pricing_basis = 'DDU'
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 550;

-- ========================================
-- STEP 2: DDPは3つの価格帯のみ
-- ========================================

-- BAND_150: $100-200
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_150',
  sample_product_price = 150,
  price_min_usd = 100,
  price_max_usd = 200
WHERE pricing_basis = 'DDP'
  AND sample_product_price <= 200;

-- BAND_275: $200-350
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_275',
  sample_product_price = 275,
  price_min_usd = 200,
  price_max_usd = 350
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 200
  AND sample_product_price <= 350;

-- BAND_450: $350-550
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_450',
  sample_product_price = 450,
  price_min_usd = 350,
  price_max_usd = 550
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 350
  AND sample_product_price <= 550;

-- DDUは価格帯不要
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = NULL,
  sample_product_price = NULL
WHERE pricing_basis = 'DDU';

-- ========================================
-- STEP 3: 2個目送料を再計算
-- ========================================

-- DDU: 実費のみ
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU';

-- DDP BAND_150: 上限$200
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    ((200 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((200 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (200 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
    ((200 + r.actual_cost_usd) * 0.065 + 
     GREATEST((200 + r.actual_cost_usd) * 0.003464, 0.30) +
     (200 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_new = 'BAND_150';

-- DDP BAND_275: 上限$350
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    ((350 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((350 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (350 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
    ((350 + r.actual_cost_usd) * 0.065 + 
     GREATEST((350 + r.actual_cost_usd) * 0.003464, 0.30) +
     (350 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_new = 'BAND_275';

-- DDP BAND_450: 上限$550
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    ((550 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((550 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (550 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
    ((550 + r.actual_cost_usd) * 0.065 + 
     GREATEST((550 + r.actual_cost_usd) * 0.003464, 0.30) +
     (550 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_new = 'BAND_450';

-- ========================================
-- STEP 4: 確認
-- ========================================

-- DDPとDDUの分布
SELECT 
  pricing_basis,
  price_band_new,
  sample_product_price,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_new, sample_product_price
ORDER BY pricing_basis DESC, sample_product_price;

-- サンプルデータ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_new,
  p.sample_product_price,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.first_item_shipping_usd, 2) as first,
  ROUND(r.additional_item_shipping_usd, 2) as additional,
  ROUND(r.handling_fee_usd, 2) as handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA')
ORDER BY p.pricing_basis DESC, p.sample_product_price, p.weight_min_kg
LIMIT 30;

COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_new IS 'DDP用価格帯（$100-550のみ）: BAND_150, BAND_275, BAND_450';
