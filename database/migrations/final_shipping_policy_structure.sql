-- database/migrations/final_shipping_policy_structure.sql
/**
 * 配送ポリシー最終構造（確定版）
 * 
 * 【重要な設計判断】
 * 1. Handlingは使わない（eBayの制約により数量比例しないため）
 * 2. 全てを送料に含める（基本送料 + DDP代行 + 梱包 + 処理）
 * 3. 送料は同額請求（1個目も2個目以降も同じ）
 */

-- 1. 配送ポリシーテーブルの構造
ALTER TABLE ebay_shipping_policies_v2
DROP COLUMN IF EXISTS combined_shipping_type,
DROP COLUMN IF EXISTS additional_item_shipping_usd,
ADD COLUMN IF NOT EXISTS all_in_shipping BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS shipping_includes_ddp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_includes_packaging BOOLEAN DEFAULT true;

-- 2. ZONE別レートの構造を更新
ALTER TABLE ebay_policy_zone_rates_v2
DROP COLUMN IF EXISTS handling_fee_base_usd,
DROP COLUMN IF EXISTS handling_includes_ddp,
ADD COLUMN IF NOT EXISTS base_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ddp_proxy_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS packaging_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_usd DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_shipping_per_item_usd DECIMAL(10,2);

-- 3. 軽量帯（0.5-2kg）DDP の送料設定
UPDATE ebay_policy_zone_rates_v2 r
SET 
  base_shipping_usd = 25.00,
  ddp_proxy_usd = 5.00,
  packaging_usd = 3.00,
  processing_usd = 2.00,
  total_shipping_per_item_usd = 35.00,  -- 25+5+3+2
  display_shipping_usd = 35.00,
  actual_cost_usd = 25.00  -- 実費は基本送料のみ
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 4. 軽量帯（0.5-2kg）DDU の送料設定（DDP代行なし）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  base_shipping_usd = 25.00,
  ddp_proxy_usd = 0.00,  -- DDUはDDP代行不要
  packaging_usd = 3.00,
  processing_usd = 2.00,
  total_shipping_per_item_usd = 30.00,  -- 25+0+3+2
  display_shipping_usd = 30.00,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0;

-- 5. 小型帯（2-5kg）DDP
UPDATE ebay_policy_zone_rates_v2 r
SET 
  base_shipping_usd = 45.00,
  ddp_proxy_usd = 5.00,
  packaging_usd = 5.00,
  processing_usd = 3.00,
  total_shipping_per_item_usd = 58.00,
  display_shipping_usd = 58.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 6. 小型帯（2-5kg）DDU
UPDATE ebay_policy_zone_rates_v2 r
SET 
  base_shipping_usd = 45.00,
  ddp_proxy_usd = 0.00,
  packaging_usd = 5.00,
  processing_usd = 3.00,
  total_shipping_per_item_usd = 53.00,
  display_shipping_usd = 53.00,
  actual_cost_usd = 45.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU'
  AND p.weight_min_kg = 2.0
  AND p.weight_max_kg = 5.0;

-- 7. ポリシー設定を更新
UPDATE ebay_shipping_policies_v2
SET 
  all_in_shipping = true,
  shipping_includes_ddp = (pricing_basis = 'DDP'),
  shipping_includes_packaging = true
WHERE active = true;

-- 8. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight,
  r.zone_code,
  r.base_shipping_usd as base,
  r.ddp_proxy_usd as ddp,
  r.packaging_usd as pkg,
  r.processing_usd as proc,
  r.total_shipping_per_item_usd as total,
  r.display_shipping_usd as display,
  r.actual_cost_usd as actual_cost
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'OTHER')
ORDER BY p.weight_min_kg, p.pricing_basis, r.zone_code
LIMIT 30;

-- 9. サマリー
SELECT 
  p.pricing_basis,
  p.weight_min_kg || '-' || p.weight_max_kg || 'kg' as weight_range,
  ROUND(AVG(r.total_shipping_per_item_usd), 2) as avg_shipping_per_item,
  ROUND(AVG(r.actual_cost_usd), 2) as avg_actual_cost,
  COUNT(DISTINCT p.id) as policy_count
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
GROUP BY p.pricing_basis, p.weight_min_kg, p.weight_max_kg
ORDER BY p.weight_min_kg, p.pricing_basis;

-- 10. コメント追加
COMMENT ON COLUMN ebay_policy_zone_rates_v2.total_shipping_per_item_usd IS '表示送料（1個あたり）= 基本送料 + DDP代行 + 梱包 + 処理';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.base_shipping_usd IS '基本送料（実費）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.ddp_proxy_usd IS 'DDP代行手数料（DDPのみ）';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.packaging_usd IS '梱包費';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.processing_usd IS '処理費';
