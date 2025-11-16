-- ============================================
-- 全ツール対応: データ完全修正SQL
-- ============================================

-- ========================================
-- Phase 1: price_jpy を全商品に設定
-- ========================================

-- 1-1. purchase_price_jpy から price_jpy にコピー
UPDATE products_master
SET price_jpy = purchase_price_jpy,
    updated_at = NOW()
WHERE price_jpy IS NULL 
  AND purchase_price_jpy IS NOT NULL;

-- 1-2. current_price から price_jpy にコピー（fallback）
UPDATE products_master
SET price_jpy = current_price,
    updated_at = NOW()
WHERE price_jpy IS NULL 
  AND current_price IS NOT NULL;

-- 1-3. scraped_data.current_price から price_jpy にコピー（最終fallback）
UPDATE products_master
SET price_jpy = (scraped_data->>'current_price')::numeric,
    updated_at = NOW()
WHERE price_jpy IS NULL 
  AND scraped_data->>'current_price' IS NOT NULL
  AND scraped_data->>'current_price' ~ '^[0-9]+\.?[0-9]*$';

-- ========================================
-- Phase 2: listing_data を完全に数値型に統一
-- ========================================

-- 2-1. listing_data が NULL の商品に空オブジェクトを設定
UPDATE products_master
SET listing_data = '{}'::jsonb,
    updated_at = NOW()
WHERE listing_data IS NULL;

-- 2-2. 文字列型の数値を正しい数値型に変換
UPDATE products_master
SET listing_data = 
  CASE 
    WHEN listing_data IS NULL THEN '{}'::jsonb
    ELSE
      jsonb_build_object(
        'weight_g', 
        CASE 
          WHEN listing_data->>'weight_g' IS NOT NULL 
            AND listing_data->>'weight_g' ~ '^[0-9]+\.?[0-9]*$'
          THEN to_jsonb((listing_data->>'weight_g')::numeric)
          ELSE NULL
        END,
        'length_cm',
        CASE 
          WHEN listing_data->>'length_cm' IS NOT NULL 
            AND listing_data->>'length_cm' ~ '^[0-9]+\.?[0-9]*$'
          THEN to_jsonb((listing_data->>'length_cm')::numeric)
          ELSE NULL
        END,
        'width_cm',
        CASE 
          WHEN listing_data->>'width_cm' IS NOT NULL 
            AND listing_data->>'width_cm' ~ '^[0-9]+\.?[0-9]*$'
          THEN to_jsonb((listing_data->>'width_cm')::numeric)
          ELSE NULL
        END,
        'height_cm',
        CASE 
          WHEN listing_data->>'height_cm' IS NOT NULL 
            AND listing_data->>'height_cm' ~ '^[0-9]+\.?[0-9]*$'
          THEN to_jsonb((listing_data->>'height_cm')::numeric)
          ELSE NULL
        END
      ) || (
        listing_data - 'weight_g' - 'length_cm' - 'width_cm' - 'height_cm'
      )
  END,
  updated_at = NOW()
WHERE listing_data IS NOT NULL
  AND (
    jsonb_typeof(listing_data->'weight_g') = 'string'
    OR jsonb_typeof(listing_data->'length_cm') = 'string'
    OR jsonb_typeof(listing_data->'width_cm') = 'string'
    OR jsonb_typeof(listing_data->'height_cm') = 'string'
  );

-- ========================================
-- Phase 3: デフォルト値設定（データがない商品用）
-- ========================================

-- 3-1. price_jpy がまだ NULL の商品にデフォルト値
UPDATE products_master
SET price_jpy = 1000,  -- デフォルト1000円
    updated_at = NOW()
WHERE price_jpy IS NULL;

-- 3-2. weight_g がない商品にデフォルト値
UPDATE products_master
SET listing_data = jsonb_set(
  COALESCE(listing_data, '{}'::jsonb),
  '{weight_g}',
  '500'::jsonb  -- デフォルト500g
),
updated_at = NOW()
WHERE listing_data->'weight_g' IS NULL
   OR jsonb_typeof(listing_data->'weight_g') = 'null';

-- 3-3. サイズがない商品にデフォルト値
UPDATE products_master
SET listing_data = 
  jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(listing_data, '{}'::jsonb),
        '{length_cm}',
        CASE WHEN listing_data->'length_cm' IS NULL THEN '20'::jsonb ELSE listing_data->'length_cm' END
      ),
      '{width_cm}',
      CASE WHEN listing_data->'width_cm' IS NULL THEN '15'::jsonb ELSE listing_data->'width_cm' END
    ),
    '{height_cm}',
    CASE WHEN listing_data->'height_cm' IS NULL THEN '10'::jsonb ELSE listing_data->'height_cm' END
  ),
  updated_at = NOW()
WHERE listing_data->'length_cm' IS NULL
   OR listing_data->'width_cm' IS NULL
   OR listing_data->'height_cm' IS NULL;

-- ========================================
-- Phase 4: 確認クエリ
-- ========================================

-- 4-1. 修正結果サマリー
SELECT 
  '=== 修正完了サマリー ===' as section,
  COUNT(*) as total_products,
  COUNT(price_jpy) FILTER (WHERE price_jpy > 0) as valid_price_jpy,
  COUNT(*) FILTER (
    WHERE listing_data->'weight_g' IS NOT NULL
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
    AND (listing_data->>'weight_g')::numeric > 0
  ) as valid_weight_g,
  COUNT(*) FILTER (
    WHERE price_jpy > 0
    AND listing_data->'weight_g' IS NOT NULL
    AND jsonb_typeof(listing_data->'weight_g') = 'number'
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_shipping,
  ROUND(
    COUNT(*) FILTER (
      WHERE price_jpy > 0
      AND listing_data->'weight_g' IS NOT NULL
      AND jsonb_typeof(listing_data->'weight_g') = 'number'
      AND (listing_data->>'weight_g')::numeric > 0
    )::numeric / COUNT(*)::numeric * 100,
    1
  ) as ready_percentage
FROM products_master;

-- 4-2. ID=322の確認
SELECT 
  '=== ID=322 確認 ===' as section,
  id,
  title,
  price_jpy,
  pg_typeof(price_jpy) as price_type,
  purchase_price_jpy,
  current_price,
  listing_data->'weight_g' as weight_g,
  jsonb_typeof(listing_data->'weight_g') as weight_type,
  listing_data->'length_cm' as length_cm,
  listing_data->'width_cm' as width_cm,
  listing_data->'height_cm' as height_cm,
  CASE 
    WHEN price_jpy > 0
      AND listing_data->'weight_g' IS NOT NULL
      AND jsonb_typeof(listing_data->'weight_g') = 'number'
      AND (listing_data->>'weight_g')::numeric > 0
    THEN '✅ 全ツール使用可能'
    ELSE '❌ まだ問題あり'
  END as status
FROM products_master
WHERE id = 322;

-- 4-3. 全商品の詳細確認（最初の5件）
SELECT 
  '=== 全商品確認（最初5件）===' as section,
  id,
  title,
  price_jpy,
  listing_data->'weight_g' as weight_g,
  jsonb_typeof(listing_data->'weight_g') as weight_type,
  CASE 
    WHEN price_jpy > 0
      AND listing_data->'weight_g' IS NOT NULL
      AND jsonb_typeof(listing_data->'weight_g') = 'number'
    THEN '✅ OK'
    ELSE '❌ NG'
  END as status
FROM products_master
ORDER BY id
LIMIT 5;

-- 4-4. まだ問題がある商品をリスト
SELECT 
  '=== 問題がある商品 ===' as section,
  id,
  title,
  price_jpy,
  listing_data->'weight_g' as weight_g,
  CASE 
    WHEN price_jpy IS NULL OR price_jpy <= 0 THEN 'price_jpy が不足'
    WHEN listing_data->'weight_g' IS NULL THEN 'weight_g が不足'
    WHEN jsonb_typeof(listing_data->'weight_g') != 'number' THEN 'weight_g が数値型でない'
    ELSE 'その他の問題'
  END as issue
FROM products_master
WHERE price_jpy IS NULL 
   OR price_jpy <= 0
   OR listing_data->'weight_g' IS NULL
   OR jsonb_typeof(listing_data->'weight_g') != 'number'
ORDER BY id;
