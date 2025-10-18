-- database/migrations/final_shipping_policy_complete.sql
/**
 * 配送ポリシー最終確定版
 * 
 * 【戦略】
 * DDU: $0-150 + $450以上（送料は実費のみ）
 * DDP: $150-450（送料に関税・手数料を含む、2つの価格帯）
 * 
 * 【2個目以降の送料】
 * DDP: 実費 + 手数料増加分（上限価格で計算）
 * DDU: 実費と同額
 */

-- ========================================
-- STEP 1: カラムを追加
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
-- STEP 3: DDPの価格帯を2つに設定
-- ========================================

-- 既存のDDPで sample_product_price=200 → BAND_200 ($150-250)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_final = 'BAND_200',
  sample_product_price = 200,
  price_min_usd = 150,
  price_max_usd = 250
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 200;

-- 既存のDDPで sample_product_price=550 → BAND_350 ($250-450)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_final = 'BAND_350',
  sample_product_price = 350,
  price_min_usd = 250,
  price_max_usd = 450
WHERE pricing_basis = 'DDP'
  AND sample_product_price = 550;

-- DDUは価格帯なし
UPDATE ebay_shipping_policies_v2
SET price_band_final = NULL
WHERE pricing_basis = 'DDU';

-- ========================================
-- STEP 4: 2個目以降の送料を計算
-- ========================================

-- DDU: 実費と同額（シンプル）
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = r.actual_cost_usd
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDU';

-- DDP BAND_200: 上限$250で計算
-- 手数料 = 関税 + MPF + HMF + eBay DDP
-- 2個目の手数料増加分 = (2個のDDP) - (1個のDDP)
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    -- 2個購入時のDDPコスト
    ((250 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((250 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (250 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
    -- 1個購入時のDDPコスト
    ((250 + r.actual_cost_usd) * 0.065 + 
     GREATEST((250 + r.actual_cost_usd) * 0.003464, 0.30) +
     (250 + r.actual_cost_usd) * 0.00125 + 5)
  )
FROM ebay_shipping_policies_v2 p
WHERE r.policy_id = p.id
  AND p.pricing_basis = 'DDP'
  AND p.price_band_final = 'BAND_200';

-- DDP BAND_350: 上限$450で計算
UPDATE ebay_policy_zone_rates_v2 r
SET additional_item_shipping_usd = 
  r.actual_cost_usd + (
    ((450 * 2 + r.actual_cost_usd * 2) * 0.065 + 
     GREATEST((450 * 2 + r.actual_cost_usd * 2) * 0.003464, 0.30) +
     (450 * 2 + r.actual_cost_usd * 2) * 0.00125 + 5) -
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

-- サマリー
SELECT 
  pricing_basis,
  price_band_final,
  sample_product_price,
  price_min_usd || '-' || price_max_usd as price_range,
  COUNT(*) as policy_count
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd
ORDER BY 
  CASE pricing_basis WHEN 'DDP' THEN 1 ELSE 2 END,
  sample_product_price NULLS LAST;

-- 詳細データ（USAとOTHER）
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_final,
  p.sample_product_price as assumed_price,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.actual_cost_usd, 2) as actual_cost,
  ROUND(r.first_item_shipping_usd, 2) as first_ship,
  ROUND(r.additional_item_shipping_usd, 2) as add_ship,
  ROUND(r.handling_fee_usd, 2) as handling,
  -- 2個購入時の総送料
  ROUND(r.first_item_shipping_usd + r.additional_item_shipping_usd, 2) as total_2items_ship
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code IN ('US', 'FA')
ORDER BY 
  p.pricing_basis DESC,
  p.sample_product_price NULLS LAST,
  p.weight_min_kg,
  r.zone_code
LIMIT 50;

-- 重量帯別サマリー
SELECT 
  p.pricing_basis,
  p.price_band_final,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  COUNT(DISTINCT p.id) as policies,
  ROUND(AVG(r.actual_cost_usd) FILTER (WHERE r.zone_code = 'US'), 2) as avg_actual_us,
  ROUND(AVG(r.first_item_shipping_usd) FILTER (WHERE r.zone_code = 'US'), 2) as avg_first_us,
  ROUND(AVG(r.additional_item_shipping_usd) FILTER (WHERE r.zone_code = 'US'), 2) as avg_add_us
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
GROUP BY p.pricing_basis, p.price_band_final, p.weight_min_kg, p.weight_max_kg
ORDER BY 
  p.pricing_basis DESC,
  p.weight_min_kg;

-- ========================================
-- STEP 6: 検証（赤字チェック）
-- ========================================

-- DDPで2個目の手数料が正しく計算されているか
SELECT 
  p.policy_name,
  p.price_band_final,
  p.sample_product_price,
  p.price_max_usd as max_price,
  r.zone_code,
  r.actual_cost_usd as actual,
  r.additional_item_shipping_usd as add_ship,
  -- 手数料増加分（理論値）
  ROUND(
    ((p.price_max_usd * 2 + r.actual_cost_usd * 2) * 0.065 + 5 + 1) -
    ((p.price_max_usd + r.actual_cost_usd) * 0.065 + 5 + 1),
    2
  ) as expected_ddp_increase,
  -- 差額（マイナスなら設定ミス）
  ROUND(
    r.additional_item_shipping_usd - r.actual_cost_usd -
    (((p.price_max_usd * 2 + r.actual_cost_usd * 2) * 0.065 + 5 + 1) -
     ((p.price_max_usd + r.actual_cost_usd) * 0.065 + 5 + 1)),
    2
  ) as difference
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.pricing_basis = 'DDP'
  AND p.active = true
  AND r.zone_code = 'US'
ORDER BY p.price_band_final, p.weight_min_kg
LIMIT 20;

-- コメント
COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_final IS 'DDP専用価格帯: BAND_200 ($150-250), BAND_350 ($250-450)';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.first_item_shipping_usd IS '1個目の送料';
COMMENT ON COLUMN ebay_policy_zone_rates_v2.additional_item_shipping_usd IS '2個目以降の追加送料';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ 配送ポリシー設定完了';
  RAISE NOTICE 'DDP: 2つの価格帯 (BAND_200, BAND_350)';
  RAISE NOTICE 'DDU: 価格帯なし';
  RAISE NOTICE '2個目送料: 上限価格で計算（赤字なし）';
END $$;
