-- database/migrations/final_multi_item_shipping_complete.sql
/**
 * 複数購入対応の最終版
 * 
 * 【方針】
 * 1. DDPのみ価格帯を4つに分割（$150/$275/$450/$700）
 * 2. DDUは価格帯なし（実費のみ）
 * 3. 2個目の送料 = 実費 + DDP手数料（最大値で安全計算）
 * 4. Handlingは消費税還付用（数量比例しない）
 */

-- ========================================
-- STEP 1: カラムを追加
-- ========================================
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS first_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2);

-- ========================================
-- STEP 2: 既存データをコピー
-- ========================================
UPDATE ebay_policy_zone_rates_v2
SET first_item_shipping_usd = display_shipping_usd
WHERE first_item_shipping_usd IS NULL;

-- ========================================
-- STEP 3: DDU（シンプル）
-- 2個目 = 実費と同額
-- ========================================
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND r.additional_item_shipping_usd IS NULL;

-- ========================================
-- STEP 4: DDPの価格帯を4つに分割
-- ========================================
ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS price_band_new VARCHAR(20);

-- Band 1: $100-200 (想定$150)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_150',
  sample_product_price = 150,
  price_min_usd = 100,
  price_max_usd = 200
WHERE pricing_basis = 'DDP'
  AND sample_product_price <= 200;

-- Band 2: $200-350 (想定$275)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_275',
  sample_product_price = 275,
  price_min_usd = 200,
  price_max_usd = 350
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 200
  AND sample_product_price <= 400;

-- Band 3: $350-550 (想定$450)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_450',
  sample_product_price = 450,
  price_min_usd = 350,
  price_max_usd = 550
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 400
  AND sample_product_price <= 550;

-- Band 4: $550+ (想定$700)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_700',
  sample_product_price = 700,
  price_min_usd = 550,
  price_max_usd = 1000
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 550;

-- ========================================
-- STEP 5: DDPの2個目送料を計算（最大値で安全に）
-- ========================================

/**
 * DDP手数料の計算式（最大値）:
 * 
 * 2個購入時のCIF = (商品価格×2) + (送料1個目 + 送料2個目)
 * 関税率 = 6.5%
 * MPF = CIF × 0.3464%（最低$0.30）
 * HMF = CIF × 0.125%
 * eBay DDP = $5
 * 
 * DDPコスト増加分 = (2個のDDP) - (1個のDDP)
 * 2個目送料 = 実費 + DDPコスト増加分（最大値）
 */

-- Band 1: $150 (上限$200で計算)
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    -- 2個購入時のDDPコスト増加分（最大値$200で計算）
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
  AND p.price_band_new = 'BAND_150'
  AND r.additional_item_shipping_usd IS NULL;

-- Band 2: $275 (上限$350で計算)
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
  AND p.price_band_new = 'BAND_275'
  AND r.additional_item_shipping_usd IS NULL;

-- Band 3: $450 (上限$550で計算)
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
  AND p.price_band_new = 'BAND_450'
  AND r.additional_item_shipping_usd IS NULL;

-- Band 4: $700 (上限$1000で計算)
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    ((1000 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((1000 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (1000 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
    ((1000 + r.actual_cost_usd) * 0.065 + 
     GREATEST((1000 + r.actual_cost_usd) * 0.003464, 0.30) +
     (1000 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_new = 'BAND_700'
  AND r.additional_item_shipping_usd IS NULL;

-- ========================================
-- STEP 6: 確認クエリ
-- ========================================
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_new,
  p.sample_product_price as assumed_price,
  p.price_max_usd as max_price,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight,
  r.zone_code,
  ROUND(r.actual_cost_usd, 2) as actual_cost,
  ROUND(r.first_item_shipping_usd, 2) as first_ship,
  ROUND(r.additional_item_shipping_usd, 2) as add_ship,
  ROUND(r.handling_fee_usd, 2) as handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA')
ORDER BY 
  p.pricing_basis DESC,
  p.sample_product_price,
  p.weight_min_kg,
  r.zone_code
LIMIT 50;

-- ========================================
-- STEP 7: サマリー
-- ========================================
SELECT 
  p.pricing_basis,
  p.price_band_new,
  p.sample_product_price,
  COUNT(DISTINCT p.id) as policy_count,
  ROUND(AVG(r.first_item_shipping_usd), 2) as avg_first,
  ROUND(AVG(r.additional_item_shipping_usd), 2) as avg_additional,
  ROUND(AVG(r.handling_fee_usd), 2) as avg_handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code = 'US'
GROUP BY p.pricing_basis, p.price_band_new, p.sample_product_price
ORDER BY p.pricing_basis DESC, p.sample_product_price;

-- コメント追加
COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目の送料';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降の追加送料（DDP: 実費+手数料増加分、DDU: 実費のみ）';
COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_new IS 'DDP用価格帯: BAND_150/$100-200, BAND_275/$200-350, BAND_450/$350-550, BAND_700/$550-1000';
