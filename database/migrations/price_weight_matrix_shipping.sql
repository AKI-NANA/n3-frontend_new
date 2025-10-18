-- database/migrations/price_weight_matrix_shipping.sql
/**
 * 価格帯×重量帯マトリックスの送料設定
 * 
 * 【設計方針】
 * 1. 価格帯ごとに平均商品価格を想定
 * 2. その価格でのDDPコストを計算
 * 3. 1個目送料 = 基本送料 + DDPコスト
 * 4. 2個目以降 = 追加配送費 + DDPコスト増加分
 * 5. Handlingは消費税還付用（固定）
 */

-- 1. 価格帯の定義を追加
ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS price_band VARCHAR(20),
ADD COLUMN IF NOT EXISTS assumed_item_price_usd DECIMAL(10,2);

-- 2. 価格帯を設定
UPDATE ebay_shipping_policies_v2
SET 
  price_band = CASE 
    WHEN policy_name LIKE '%LowPrice%' OR policy_name LIKE '%低価格%' THEN 'LOW'
    WHEN policy_name LIKE '%MidPrice%' OR policy_name LIKE '%中価格%' THEN 'MID'
    WHEN policy_name LIKE '%HighPrice%' OR policy_name LIKE '%高価格%' THEN 'HIGH'
    ELSE 'LOW'
  END,
  assumed_item_price_usd = CASE 
    WHEN policy_name LIKE '%LowPrice%' OR policy_name LIKE '%低価格%' THEN 100.00
    WHEN policy_name LIKE '%MidPrice%' OR policy_name LIKE '%中価格%' THEN 225.00
    WHEN policy_name LIKE '%HighPrice%' OR policy_name LIKE '%高価格%' THEN 400.00
    ELSE 100.00
  END;

-- 3. 軽量帯（0.5-2kg）× 価格帯別の送料設定

-- LowPrice × Light (平均$100)
-- 1個目: $25 + DDP$13.71 = $38.71
-- 2個目: $10 + DDP増加$7.67 = $17.67
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 38.71,
  additional_item_shipping_usd = 17.67,
  handling_fee_usd = 8.00,
  display_shipping_usd = 38.71,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'LOW';

-- MidPrice × Light (平均$225)
-- 1個目: $25 + DDP$22.43 = $47.43
-- 2個目: $10 + DDP増加$16.38 = $26.38
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 47.43,
  additional_item_shipping_usd = 26.38,
  handling_fee_usd = 8.00,
  display_shipping_usd = 47.43,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'MID';

-- HighPrice × Light (平均$400)
-- 1個目: $25 + DDP$34.63 = $59.63
-- 2個目: $10 + DDP増加$28.58 = $38.58
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 59.63,
  additional_item_shipping_usd = 38.58,
  handling_fee_usd = 8.00,
  display_shipping_usd = 59.63,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'HIGH';

-- 4. 小型帯（2-5kg）× 価格帯別
-- 基本送料: $45、追加配送費: $13

-- LowPrice × Small
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 65.00,  -- $45 + DDP約$20
  additional_item_shipping_usd = 23.00,  -- $13 + DDP増加約$10
  handling_fee_usd = 10.00,
  display_shipping_usd = 65.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0
  AND p.price_band = 'LOW';

-- MidPrice × Small
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 75.00,
  additional_item_shipping_usd = 33.00,
  handling_fee_usd = 10.00,
  display_shipping_usd = 75.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0
  AND p.price_band = 'MID';

-- HighPrice × Small
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 88.00,
  additional_item_shipping_usd = 48.00,
  handling_fee_usd = 10.00,
  display_shipping_usd = 88.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0
  AND p.price_band = 'HIGH';

-- 5. 中型帯（5-10kg）× 価格帯別
-- 基本送料: $95、追加配送費: $30

-- LowPrice × Medium
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 115.00,
  additional_item_shipping_usd = 40.00,
  handling_fee_usd = 15.00,
  display_shipping_usd = 115.00,
  actual_cost_usd = 95.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0
  AND p.price_band = 'LOW';

-- MidPrice × Medium
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 128.00,
  additional_item_shipping_usd = 55.00,
  handling_fee_usd = 15.00,
  display_shipping_usd = 128.00,
  actual_cost_usd = 95.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0
  AND p.price_band = 'MID';

-- HighPrice × Medium
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 145.00,
  additional_item_shipping_usd = 75.00,
  handling_fee_usd = 15.00,
  display_shipping_usd = 145.00,
  actual_cost_usd = 95.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0
  AND p.price_band = 'HIGH';

-- 6. 大型帯（10-15kg）× 価格帯別
-- 基本送料: $145、追加配送費: $35

-- LowPrice × Large
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 170.00,  -- ✅ $65→$170に修正
  additional_item_shipping_usd = 50.00,
  handling_fee_usd = 20.00,
  display_shipping_usd = 170.00,
  actual_cost_usd = 145.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 10.0
  AND p.weight_max_kg = 15.0
  AND p.price_band = 'LOW';

-- MidPrice × Large
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 188.00,
  additional_item_shipping_usd = 70.00,
  handling_fee_usd = 20.00,
  display_shipping_usd = 188.00,
  actual_cost_usd = 145.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 10.0
  AND p.weight_max_kg = 15.0
  AND p.price_band = 'MID';

-- HighPrice × Large
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 210.00,
  additional_item_shipping_usd = 95.00,
  handling_fee_usd = 20.00,
  display_shipping_usd = 210.00,
  actual_cost_usd = 145.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 10.0
  AND p.weight_max_kg = 15.0
  AND p.price_band = 'HIGH';

-- 7. DDUは実費のみ（DDPコストなし）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = r.actual_cost_usd,
  additional_item_shipping_usd = CASE 
    WHEN p.weight_max_kg <= 2 THEN 10.00
    WHEN p.weight_max_kg <= 5 THEN 13.00
    WHEN p.weight_max_kg <= 10 THEN 30.00
    ELSE 35.00
  END,
  display_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU';

-- 8. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band,
  p.assumed_item_price_usd as assumed_price,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight,
  r.first_item_shipping_usd as first_ship,
  r.additional_item_shipping_usd as add_ship,
  r.handling_fee_usd as handling,
  r.actual_cost_usd as actual
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code = 'US'
ORDER BY p.weight_min_kg, p.price_band, p.pricing_basis
LIMIT 50;

COMMENT ON COLUMN ebay_shipping_policies_v2.price_band IS '価格帯: LOW($50-150), MID($150-300), HIGH($300-500)';
COMMENT ON COLUMN ebay_shipping_policies_v2.assumed_item_price_usd IS '想定商品価格（DDPコスト計算用）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目送料 = 基本送料 + DDPコスト';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降 = 追加配送費 + DDPコスト増加分';
