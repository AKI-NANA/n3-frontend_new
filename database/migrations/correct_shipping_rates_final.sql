-- database/migrations/correct_shipping_rates_final.sql
/**
 * 正しい送料設定（最終確定版）
 * 
 * 【設計方針】
 * 1. Handlingは消費税還付のために使う（梱包+処理）
 * 2. 2個目以降の送料を実費+DDP代行で設定
 * 3. 送料を実際の相場に合わせて修正
 */

-- 1. ZONE別レートのカラムを整理
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS first_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS handling_fee_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS handling_packaging_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS handling_processing_usd DECIMAL(10,2);

-- 2. 軽量帯（0.5-2kg）DDP - 正しい送料
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 25.00,          -- 基本送料（実費）
  additional_item_shipping_usd = 15.00,     -- 実費$10 + DDP代行$5
  handling_fee_usd = 8.00,                  -- 梱包$5 + 処理$3
  handling_packaging_usd = 5.00,
  handling_processing_usd = 3.00,
  display_shipping_usd = 25.00,             -- 表示は1個目の送料
  actual_cost_usd = 25.00                   -- 実費
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 3. 軽量帯（0.5-2kg）DDU
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 25.00,
  additional_item_shipping_usd = 10.00,     -- 実費のみ
  handling_fee_usd = 8.00,
  handling_packaging_usd = 5.00,
  handling_processing_usd = 3.00,
  display_shipping_usd = 25.00,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 4. 小型帯（2-5kg）DDP
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 45.00,
  additional_item_shipping_usd = 18.00,     -- 実費$13 + DDP代行$5
  handling_fee_usd = 10.00,
  handling_packaging_usd = 7.00,
  handling_processing_usd = 3.00,
  display_shipping_usd = 45.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 5. 小型帯（2-5kg）DDU
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 45.00,
  additional_item_shipping_usd = 13.00,
  handling_fee_usd = 10.00,
  handling_packaging_usd = 7.00,
  handling_processing_usd = 3.00,
  display_shipping_usd = 45.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 6. 中型帯（5-10kg）DDP
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 95.00,          -- 正しい相場
  additional_item_shipping_usd = 35.00,     -- 実費$30 + DDP代行$5
  handling_fee_usd = 15.00,
  handling_packaging_usd = 10.00,
  handling_processing_usd = 5.00,
  display_shipping_usd = 95.00,
  actual_cost_usd = 95.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0;

-- 7. 中型帯（5-10kg）DDU
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 95.00,
  additional_item_shipping_usd = 30.00,
  handling_fee_usd = 15.00,
  handling_packaging_usd = 10.00,
  handling_processing_usd = 5.00,
  display_shipping_usd = 95.00,
  actual_cost_usd = 95.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0;

-- 8. 大型帯（10-15kg）DDP - 重要な修正！
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 145.00,         -- ❌ $65 → ✅ $145
  additional_item_shipping_usd = 40.00,     -- 実費$35 + DDP代行$5
  handling_fee_usd = 20.00,
  handling_packaging_usd = 13.00,
  handling_processing_usd = 7.00,
  display_shipping_usd = 145.00,
  actual_cost_usd = 145.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 10.0
  AND p.weight_max_kg = 15.0;

-- 9. 大型帯（10-15kg）DDU
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 145.00,
  additional_item_shipping_usd = 35.00,
  handling_fee_usd = 20.00,
  handling_packaging_usd = 13.00,
  handling_processing_usd = 7.00,
  display_shipping_usd = 145.00,
  actual_cost_usd = 145.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 10.0
  AND p.weight_max_kg = 15.0;

-- 10. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight,
  r.zone_code,
  r.first_item_shipping_usd as first_ship,
  r.additional_item_shipping_usd as add_ship,
  r.handling_fee_usd as handling,
  r.actual_cost_usd as actual,
  -- 複数購入時の例
  (r.first_item_shipping_usd + r.handling_fee_usd) as qty1_total,
  (r.first_item_shipping_usd + r.additional_item_shipping_usd + r.handling_fee_usd) as qty2_ship_only
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'OTHER')
ORDER BY p.weight_min_kg, p.pricing_basis, r.zone_code
LIMIT 40;

-- 11. サマリー（重量帯別）
SELECT 
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight_range,
  ROUND(AVG(r.first_item_shipping_usd), 2) as avg_first_ship,
  ROUND(AVG(r.additional_item_shipping_usd), 2) as avg_add_ship,
  ROUND(AVG(r.handling_fee_usd), 2) as avg_handling,
  COUNT(DISTINCT p.id) as policy_count
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
GROUP BY p.pricing_basis, p.weight_min_kg, p.weight_max_kg
ORDER BY p.weight_min_kg, p.pricing_basis;

-- 12. コメント追加
COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目の送料（基本送料）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降の送料（実費 + DDP代行$5 for DDP）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.handling_fee_usd IS 'Handling合計（消費税還付対象）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.handling_packaging_usd IS '梱包費（消費税還付対象）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.handling_processing_usd IS '処理費（消費税還付対象）';
