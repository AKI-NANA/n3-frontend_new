-- database/migrations/add_multi_item_shipping_columns.sql
/**
 * 複数購入対応：2個目以降の送料設定カラムを追加
 * 
 * 【追加するカラム】
 * - first_item_shipping_usd: 1個目の送料
 * - additional_item_shipping_usd: 2個目以降の追加送料
 */

-- 1. カラムを追加
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS first_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2);

-- 2. 既存のdisplay_shipping_usdをfirst_item_shipping_usdにコピー
UPDATE ebay_policy_zone_rates_v2
SET first_item_shipping_usd = display_shipping_usd
WHERE first_item_shipping_usd IS NULL;

-- 3. DDUの場合：2個目は実費と同額
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND r.additional_item_shipping_usd IS NULL;

-- 4. DDPの場合：2個目は実費 + 想定手数料増加分
-- （まず一時的に実費の1.5倍に設定、後で精密計算）
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd * 0.4
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND r.additional_item_shipping_usd IS NULL;

-- 5. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight,
  r.zone_code,
  r.actual_cost_usd as actual,
  r.first_item_shipping_usd as first,
  r.additional_item_shipping_usd as additional,
  r.handling_fee_usd as handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA', 'FB')
ORDER BY p.weight_min_kg, p.pricing_basis, r.zone_code
LIMIT 30;

COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目の送料';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降の追加送料';
