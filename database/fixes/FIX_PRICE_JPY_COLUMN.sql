-- ============================================
-- products_master に price_jpy カラムを追加
-- ============================================

-- 1. price_jpyカラムを追加（存在しない場合のみ）
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS price_jpy NUMERIC(10,2);

-- 2. 既存データから price_jpy を補完
-- 優先順位: purchase_price_jpy > current_price > scraped_data.current_price
UPDATE products_master
SET price_jpy = COALESCE(
  purchase_price_jpy,
  current_price,
  (scraped_data->>'current_price')::numeric,
  (scraped_data->>'price')::numeric
)
WHERE price_jpy IS NULL
  AND (
    purchase_price_jpy IS NOT NULL
    OR current_price IS NOT NULL
    OR scraped_data->>'current_price' IS NOT NULL
    OR scraped_data->>'price' IS NOT NULL
  );

-- 3. ID=322に明示的に値を設定
UPDATE products_master
SET price_jpy = 1500
WHERE id = 322 AND (price_jpy IS NULL OR price_jpy = 0);

-- 4. listing_data内の数値を正しい型で再設定
UPDATE products_master
SET listing_data = jsonb_build_object(
  'weight_g', (listing_data->>'weight_g')::numeric,
  'length_cm', (listing_data->>'length_cm')::numeric,
  'width_cm', (listing_data->>'width_cm')::numeric,
  'height_cm', (listing_data->>'height_cm')::numeric,
  'html_applied', COALESCE(listing_data->'html_applied', 'false'::jsonb),
  'html_description', COALESCE(listing_data->'html_description', '""'::jsonb)
)
WHERE id = 322
  AND listing_data IS NOT NULL;

-- 5. 確認クエリ
SELECT 
  '=== 修正後の確認 ===' as section,
  id,
  title,
  price_jpy,
  pg_typeof(price_jpy) as price_jpy_type,
  listing_data->'weight_g' as weight_g,
  pg_typeof(listing_data->'weight_g') as weight_g_type,
  CASE 
    WHEN price_jpy IS NOT NULL AND price_jpy > 0
      AND listing_data->'weight_g' IS NOT NULL 
      AND jsonb_typeof(listing_data->'weight_g') = 'number'
      AND (listing_data->>'weight_g')::numeric > 0
    THEN '✅ 全ツール使用可能'
    ELSE '❌ まだ不足あり'
  END as status
FROM products_master
WHERE id = 322;

-- 6. 全商品の統計
SELECT 
  '=== 全体統計 ===' as section,
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) - COUNT(price_jpy) as missing_price_jpy,
  COUNT(*) FILTER (
    WHERE listing_data->'weight_g' IS NOT NULL 
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
  ) as has_weight_g_number,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL
    AND price_jpy > 0
    AND listing_data->'weight_g' IS NOT NULL
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_all_tools
FROM products_master;
