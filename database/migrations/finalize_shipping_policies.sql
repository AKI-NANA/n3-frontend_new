// database/migrations/finalize_shipping_policies.sql
/**
 * 配送ポリシーの最終設計
 * 
 * 【重要な設計判断】
 * 1. 送料：同額請求（Combined Shipping: SAME_RATE）
 * 2. Handling：数量比例（eBayが自動的に数量をかける）
 * 3. DDP代行手数料：Handlingに含める
 */

-- 1. Handlingカラムを追加（ZONE別）
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS handling_fee_base_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS handling_includes_ddp BOOLEAN DEFAULT false;

-- 2. DDP方式のHandlingを設定（重量別）
-- 軽量帯（0.5-2kg）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 10.00,  -- 基本$5 + DDP代行$5
  handling_includes_ddp = true
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 小型帯（2-5kg）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 13.00,  -- 基本$8 + DDP代行$5
  handling_includes_ddp = true
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 中型帯（5-10kg）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 15.00,  -- 基本$10 + DDP代行$5
  handling_includes_ddp = true
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0;

-- 3. DDU方式のHandlingを設定（DDP代行なし）
-- 軽量帯
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 5.00,  -- 基本のみ
  handling_includes_ddp = false
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 小型帯
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 8.00,
  handling_includes_ddp = false
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 中型帯
UPDATE ebay_policy_zone_rates_v2 r
SET 
  handling_fee_base_usd = 10.00,
  handling_includes_ddp = false
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 5.0
  AND p.weight_max_kg = 10.0;

-- 4. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.weight_min_kg,
  p.weight_max_kg,
  r.zone_code,
  r.display_shipping_usd,
  r.actual_cost_usd,
  r.handling_fee_base_usd,
  r.handling_includes_ddp,
  p.combined_shipping_type
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'OTHER')
ORDER BY p.weight_min_kg, p.pricing_basis, r.zone_code
LIMIT 20;

-- 5. サマリー表示
SELECT 
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight_range,
  COUNT(DISTINCT p.id) as policy_count,
  AVG(r.handling_fee_base_usd) FILTER (WHERE r.zone_code = 'US') as avg_handling_usa,
  AVG(r.handling_fee_base_usd) FILTER (WHERE r.zone_code = 'OTHER') as avg_handling_other
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
GROUP BY p.pricing_basis, p.weight_min_kg, p.weight_max_kg
ORDER BY p.weight_min_kg, p.pricing_basis;
