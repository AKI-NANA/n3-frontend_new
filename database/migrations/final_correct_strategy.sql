-- database/migrations/final_correct_strategy.sql
/**
 * 正しいDDP/DDU戦略の実装
 * 
 * 【戦略】
 * DDU: $50-100（低価格） + $550+（超高額） → 利益率調整が容易
 * DDP: $100-550（中価格帯のみ） → 関税が複雑な価格帯
 * 
 * 【価格帯】
 * DDP: 3つ（BAND_150, BAND_275, BAND_450）
 * DDU: 価格帯なし（全価格対応）
 */

-- ========================================
-- STEP 1: カラムを追加
-- ========================================
ALTER TABLE ebay_policy_zone_rates_v2
ADD COLUMN IF NOT EXISTS first_item_shipping_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2);

ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS price_band_new VARCHAR(20);

-- ========================================
-- STEP 2: 既存データをコピー
-- ========================================
UPDATE ebay_policy_zone_rates_v2
SET first_item_shipping_usd = display_shipping_usd
WHERE first_item_shipping_usd IS NULL;

-- ========================================
-- STEP 3: 現在のDDPポリシーを確認して分類
-- ========================================

-- 現在sample_product_price=200のポリシー → 中価格帯（DDP維持）
-- BAND_150: $100-200
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_150',
  sample_product_price = 150,
  price_min_usd = 100,
  price_max_usd = 200
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 200;

-- 現在sample_product_price=550のポリシー → 分割
-- BAND_275: $200-350
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_275',
  sample_product_price = 275,
  price_min_usd = 200,
  price_max_usd = 350
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 550
  AND policy_number % 2 = 0;  -- 半分を275に

-- BAND_450: $350-550
UPDATE ebay_shipping_policies_v2
SET 
  price_band_new = 'BAND_450',
  sample_product_price = 450,
  price_min_usd = 350,
  price_max_usd = 550
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 550
  AND policy_number % 2 = 1;  -- 半分を450に

-- ========================================
-- STEP 4: DDUは価格帯なし
-- ========================================
UPDATE ebay_shipping_policies_v2
SET price_band_new = NULL
WHERE pricing_basis = 'DDU';

-- ========================================
-- STEP 5: 2個目送料を設定
-- ========================================

-- DDU: 実費のみ（シンプル）
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU';

-- DDP BAND_150: 上限$200で計算
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

-- DDP BAND_275: 上限$350で計算
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

-- DDP BAND_450: 上限$550で計算
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
-- STEP 6: 確認
-- ========================================

-- 戦略サマリー
SELECT 
  pricing_basis,
  price_band_new,
  sample_product_price,
  price_min_usd || '-' || price_max_usd as range,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_new, sample_product_price, price_min_usd, price_max_usd
ORDER BY 
  CASE pricing_basis WHEN 'DDP' THEN 1 ELSE 2 END,
  sample_product_price NULLS LAST;

-- 詳細データ
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_new,
  p.sample_product_price,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.actual_cost_usd, 2) as actual,
  ROUND(r.first_item_shipping_usd, 2) as first,
  ROUND(r.additional_item_shipping_usd, 2) as additional,
  ROUND(r.handling_fee_usd, 2) as handling
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA')
ORDER BY 
  p.pricing_basis DESC,
  p.sample_product_price NULLS LAST,
  p.weight_min_kg
LIMIT 40;

COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_new IS 'DDP専用価格帯（$100-550）: BAND_150/$100-200, BAND_275/$200-350, BAND_450/$350-550';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目の送料';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降（DDP:実費+手数料増、DDU:実費のみ）';
