-- database/migrations/fix_price_bands_properly.sql
/**
 * 価格帯を適切に修正
 * 
 * 【問題】
 * 現在の2つの価格帯では範囲が広すぎて赤字リスクが高い
 * - Low: $100-300 (範囲$200) → 上限で$6.50の赤字
 * - High: $300-800 (範囲$500) → 上限で$16.25の赤字
 * 
 * 【解決策】
 * 最低4つの価格帯に分割し、範囲を狭くする
 */

-- 1. 新しい価格帯カラムを追加
ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS price_band_v2 VARCHAR(20);

-- 2. 既存ポリシーを4つの価格帯に再分類

-- Band 1: $100-200 (想定平均$150)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_v2 = 'BAND_150',
  sample_product_price = 150,
  price_min_usd = 100,
  price_max_usd = 200
WHERE pricing_basis = 'DDP'
  AND sample_product_price <= 200;

-- Band 2: $200-350 (想定平均$275)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_v2 = 'BAND_275',
  sample_product_price = 275,
  price_min_usd = 200,
  price_max_usd = 350
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 200
  AND sample_product_price <= 350;

-- Band 3: $350-550 (想定平均$450)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_v2 = 'BAND_450',
  sample_product_price = 450,
  price_min_usd = 350,
  price_max_usd = 550
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 350
  AND sample_product_price <= 550;

-- Band 4: $550+ (想定平均$700)
UPDATE ebay_shipping_policies_v2
SET 
  price_band_v2 = 'BAND_700',
  sample_product_price = 700,
  price_min_usd = 550,
  price_max_usd = 1000
WHERE pricing_basis = 'DDP'
  AND sample_product_price > 550;

-- 3. 確認
SELECT 
  price_band_v2,
  sample_product_price,
  price_min_usd || '-' || price_max_usd as range,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE pricing_basis = 'DDP'
  AND active = true
GROUP BY price_band_v2, sample_product_price, price_min_usd, price_max_usd
ORDER BY sample_product_price;

-- 4. ポリシー名を更新（オプション）
UPDATE ebay_shipping_policies_v2
SET policy_name = 
  CASE 
    WHEN weight_min_kg = 0.5 AND weight_max_kg = 2 THEN 'Light_DDP_0.5-2kg_' || price_band_v2 || '_' || policy_number
    WHEN weight_min_kg = 2 AND weight_max_kg = 5 THEN 'Small_DDP_2-5kg_' || price_band_v2 || '_' || policy_number
    WHEN weight_min_kg = 5 AND weight_max_kg = 10 THEN 'Medium_DDP_5-10kg_' || price_band_v2 || '_' || policy_number
    WHEN weight_min_kg = 10 THEN 'Large_DDP_10-20kg_' || price_band_v2 || '_' || policy_number
    ELSE policy_name
  END
WHERE pricing_basis = 'DDP'
  AND active = true
  AND price_band_v2 IS NOT NULL;

COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_v2 IS '改善版価格帯: BAND_150, BAND_275, BAND_450, BAND_700';
