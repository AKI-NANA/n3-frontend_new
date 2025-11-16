-- ============================================
-- 解決策1: price_jpy カラムを追加してデータをコピー
-- ============================================

-- 1. price_jpy カラムを追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS price_jpy NUMERIC(10,2);

-- 2. purchase_price_jpy から price_jpy にコピー
UPDATE products_master
SET price_jpy = purchase_price_jpy
WHERE purchase_price_jpy IS NOT NULL;

-- 3. listing_data内の文字列を数値に変換
UPDATE products_master
SET listing_data = jsonb_build_object(
  'weight_g', (NULLIF(listing_data->>'weight_g', ''))::numeric,
  'length_cm', (NULLIF(listing_data->>'length_cm', ''))::numeric,
  'width_cm', (NULLIF(listing_data->>'width_cm', ''))::numeric,
  'height_cm', (NULLIF(listing_data->>'height_cm', ''))::numeric
) || COALESCE(
  listing_data - 'weight_g' - 'length_cm' - 'width_cm' - 'height_cm',
  '{}'::jsonb
)
WHERE listing_data IS NOT NULL
  AND (
    listing_data->>'weight_g' IS NOT NULL
    OR listing_data->>'length_cm' IS NOT NULL
    OR listing_data->>'width_cm' IS NOT NULL
    OR listing_data->>'height_cm' IS NOT NULL
  );

-- 4. 確認
SELECT 
  '=== 修正完了確認 ===' as section,
  id,
  title,
  purchase_price_jpy,
  price_jpy,
  pg_typeof(price_jpy) as price_jpy_type,
  listing_data->'weight_g' as weight_g_jsonb,
  jsonb_typeof(listing_data->'weight_g') as weight_g_type,
  CASE 
    WHEN price_jpy IS NOT NULL 
      AND listing_data->'weight_g' IS NOT NULL
      AND jsonb_typeof(listing_data->'weight_g') = 'number'
    THEN '✅ 送料計算可能'
    ELSE '❌ まだ不足'
  END as status
FROM products_master
WHERE id = 322;

-- 5. 統計
SELECT 
  COUNT(*) as total,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) FILTER (
    WHERE listing_data->'weight_g' IS NOT NULL
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
  ) as has_weight_g_number,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL
    AND listing_data->'weight_g' IS NOT NULL
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
  ) as ready_for_shipping
FROM products_master;
