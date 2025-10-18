-- database/migrations/six_price_bands_final.sql
/**
 * 6つの価格帯による配送ポリシー（最終版）
 * 
 * 【価格帯定義】
 * 1. VeryLow: $10-50 (平均$30) - エントリー商品
 * 2. Low: $50-150 (平均$100) - 低価格帯
 * 3. Mid: $150-300 (平均$200) - 中価格帯
 * 4. High: $300-600 (平均$400) - 高価格帯
 * 5. Premium: $600-1200 (平均$800) - プレミアム帯
 * 6. Luxury: $1200+ (平均$2000) - 超高額帯
 * 
 * 【複数購入リスク対策】
 * - $0-300: 精密計算（複数購入が多い）
 * - $300-800: 精密計算 + 安全マージン+10%
 * - $800+: 精密計算 + 安全マージン+20%
 */

-- 1. 価格帯の enum型を作成
DO $$ BEGIN
  CREATE TYPE price_band_enum AS ENUM ('VERY_LOW', 'LOW', 'MID', 'HIGH', 'PREMIUM', 'LUXURY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 価格帯カラムを更新
ALTER TABLE ebay_shipping_policies_v2
ALTER COLUMN price_band TYPE VARCHAR(20);

-- 3. 価格帯を設定（既存のポリシー名から推測）
UPDATE ebay_shipping_policies_v2
SET 
  price_band = CASE 
    WHEN policy_name LIKE '%VeryLow%' OR policy_name LIKE '%超低価格%' THEN 'VERY_LOW'
    WHEN policy_name LIKE '%LowPrice%' OR policy_name LIKE '%低価格%' THEN 'LOW'
    WHEN policy_name LIKE '%MidPrice%' OR policy_name LIKE '%中価格%' THEN 'MID'
    WHEN policy_name LIKE '%HighPrice%' OR policy_name LIKE '%高価格%' THEN 'HIGH'
    WHEN policy_name LIKE '%Premium%' OR policy_name LIKE '%プレミアム%' THEN 'PREMIUM'
    WHEN policy_name LIKE '%Luxury%' OR policy_name LIKE '%超高額%' THEN 'LUXURY'
    ELSE 'LOW'
  END,
  assumed_item_price_usd = CASE 
    WHEN policy_name LIKE '%VeryLow%' OR policy_name LIKE '%超低価格%' THEN 30.00
    WHEN policy_name LIKE '%LowPrice%' OR policy_name LIKE '%低価格%' THEN 100.00
    WHEN policy_name LIKE '%MidPrice%' OR policy_name LIKE '%中価格%' THEN 200.00
    WHEN policy_name LIKE '%HighPrice%' OR policy_name LIKE '%高価格%' THEN 400.00
    WHEN policy_name LIKE '%Premium%' OR policy_name LIKE '%プレミアム%' THEN 800.00
    WHEN policy_name LIKE '%Luxury%' OR policy_name LIKE '%超高額%' THEN 2000.00
    ELSE 100.00
  END;

-- 4. 軽量帯（0.5-2kg）× 全価格帯の設定
-- VeryLow × Light
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 33.94,
  additional_item_shipping_usd = 16.98,
  handling_fee_usd = 8.00,
  display_shipping_usd = 33.94,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'VERY_LOW';

-- Low × Light
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

-- Mid × Light
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 45.69,
  additional_item_shipping_usd = 24.64,
  handling_fee_usd = 8.00,
  display_shipping_usd = 45.69,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'MID';

-- High × Light（安全マージン+10%）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 59.63,
  additional_item_shipping_usd = 42.44,  -- +10%マージン
  handling_fee_usd = 8.00,
  display_shipping_usd = 59.63,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'HIGH';

-- Premium × Light（安全マージン+20%）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 87.51,
  additional_item_shipping_usd = 79.76,  -- +20%マージン
  handling_fee_usd = 8.00,
  display_shipping_usd = 87.51,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'PREMIUM';

-- Luxury × Light（安全マージン+20%、高額設定）
UPDATE ebay_policy_zone_rates_v2 r
SET 
  first_item_shipping_usd = 171.17,
  additional_item_shipping_usd = 180.15,  -- +20%マージン
  handling_fee_usd = 8.00,
  display_shipping_usd = 171.17,
  actual_cost_usd = 25.00
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.weight_min_kg = 0.5
  AND p.weight_max_kg = 2.0
  AND p.price_band = 'LUXURY';

-- 5. 他の重量帯も同様に設定（小型、中型、大型）
-- ※ 同じロジックで各重量帯×価格帯の組み合わせを設定

-- 6. DDUは実費のみ（全価格帯共通）
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

-- 7. 確認クエリ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band,
  p.assumed_item_price_usd as price,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.first_item_shipping_usd as first,
  r.additional_item_shipping_usd as add,
  r.handling_fee_usd as handling,
  -- 安全マージンの確認
  CASE 
    WHEN p.assumed_item_price_usd >= 800 THEN '+20%'
    WHEN p.assumed_item_price_usd >= 400 THEN '+10%'
    ELSE '精密'
  END as strategy
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code = 'US'
  AND p.pricing_basis = 'DDP'
ORDER BY p.weight_min_kg, p.assumed_item_price_usd;

-- 8. サマリー
SELECT 
  p.price_band,
  p.assumed_item_price_usd as price,
  COUNT(*) as policy_count,
  ROUND(AVG(r.first_item_shipping_usd), 2) as avg_first_ship,
  ROUND(AVG(r.additional_item_shipping_usd), 2) as avg_add_ship
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND p.pricing_basis = 'DDP'
GROUP BY p.price_band, p.assumed_item_price_usd
ORDER BY p.assumed_item_price_usd;

COMMENT ON COLUMN ebay_shipping_policies_v2.price_band IS '価格帯: VERY_LOW($10-50), LOW($50-150), MID($150-300), HIGH($300-600), PREMIUM($600-1200), LUXURY($1200+)';
COMMENT ON COLUMN ebay_shipping_policies_v2.assumed_item_price_usd IS '想定商品価格: VeryLow=$30, Low=$100, Mid=$200, High=$400, Premium=$800, Luxury=$2000';
