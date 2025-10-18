-- database/migrations/update_shipping_policy_names.sql
/**
 * 配送ポリシー名を改善 + Combined Shipping設定追加
 */

-- 1. 一旦全てをTEMP名にリセット
UPDATE ebay_shipping_policies_v2
SET policy_name = 'TEMP_' || LPAD(id::text, 4, '0');

-- 2. 軽量帯（0.5-2kg）の命名
UPDATE ebay_shipping_policies_v2
SET policy_name = 
  'Light_' || pricing_basis || '_0.5-2kg_LowTariff_' || LPAD(id::text, 3, '0')
WHERE weight_min_kg = 0.5 AND weight_max_kg = 2.0 AND id <= 4;

UPDATE ebay_shipping_policies_v2
SET policy_name = 
  'Light_' || pricing_basis || '_0.5-2kg_HighTariff_' || LPAD(id::text, 3, '0')
WHERE weight_min_kg = 0.5 AND weight_max_kg = 2.0 AND id BETWEEN 5 AND 8;

-- 3. 小型帯（2-5kg）の命名  
UPDATE ebay_shipping_policies_v2
SET policy_name = 
  'Small_' || pricing_basis || '_2-5kg_LowTariff_' || LPAD(id::text, 3, '0')
WHERE weight_min_kg = 2.0 AND weight_max_kg = 5.0 AND id <= 20;

UPDATE ebay_shipping_policies_v2
SET policy_name = 
  'Small_' || pricing_basis || '_2-5kg_HighTariff_' || LPAD(id::text, 3, '0')
WHERE weight_min_kg = 2.0 AND weight_max_kg = 5.0 AND id BETWEEN 21 AND 40;

-- 4. Combined Shipping設定カラムを追加
ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS combined_shipping_type VARCHAR(20) DEFAULT 'SAME_RATE',
ADD COLUMN IF NOT EXISTS additional_item_shipping_usd DECIMAL(10,2);

-- 5. デフォルト値を設定
UPDATE ebay_shipping_policies_v2
SET 
  combined_shipping_type = 'SAME_RATE',
  additional_item_shipping_usd = NULL
WHERE combined_shipping_type IS NULL;

-- 確認
SELECT 
  id,
  policy_name,
  pricing_basis,
  weight_min_kg,
  weight_max_kg,
  combined_shipping_type,
  additional_item_shipping_usd,
  active
FROM ebay_shipping_policies_v2
WHERE policy_name NOT LIKE 'TEMP_%'
ORDER BY weight_min_kg, pricing_basis, id
LIMIT 20;
