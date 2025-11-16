-- ============================================
-- 型の問題を完全診断するSQL
-- ============================================

-- 1. ID=322の完全なデータ確認
SELECT 
  '=== 基本データ ===' as section,
  id,
  pg_typeof(id) as id_type,
  title,
  price_jpy,
  pg_typeof(price_jpy) as price_jpy_type,
  CASE 
    WHEN price_jpy IS NULL THEN 'NULL'
    WHEN price_jpy = 0 THEN 'ZERO'
    WHEN price_jpy > 0 THEN 'POSITIVE'
    ELSE 'NEGATIVE'
  END as price_jpy_status
FROM products_master
WHERE id = 322;

-- 2. listing_dataの詳細確認
SELECT 
  '=== listing_data ===' as section,
  id,
  listing_data,
  pg_typeof(listing_data) as listing_data_type,
  listing_data->>'weight_g' as weight_g_as_text,
  (listing_data->>'weight_g')::numeric as weight_g_as_number,
  pg_typeof(listing_data->>'weight_g') as weight_g_extracted_type,
  CASE 
    WHEN listing_data IS NULL THEN 'NULL'
    WHEN listing_data::text = '{}' THEN 'EMPTY_OBJECT'
    WHEN listing_data->>'weight_g' IS NULL THEN 'KEY_NOT_EXISTS'
    WHEN (listing_data->>'weight_g')::numeric = 0 THEN 'ZERO'
    WHEN (listing_data->>'weight_g')::numeric > 0 THEN 'POSITIVE'
    ELSE 'OTHER'
  END as weight_g_status
FROM products_master
WHERE id = 322;

-- 3. 型の不一致を検出
SELECT 
  '=== 型の問題検出 ===' as section,
  id,
  title,
  -- price_jpyの型確認
  CASE 
    WHEN pg_typeof(price_jpy)::text != 'numeric' THEN 
      '❌ price_jpyの型が間違っています: ' || pg_typeof(price_jpy)::text
    WHEN price_jpy IS NULL THEN
      '❌ price_jpyがNULLです'
    WHEN price_jpy <= 0 THEN
      '⚠️ price_jpyが0以下です: ' || price_jpy::text
    ELSE
      '✅ price_jpy OK: ' || price_jpy::text
  END as price_jpy_diagnosis,
  -- weight_gの確認
  CASE 
    WHEN listing_data IS NULL THEN
      '❌ listing_dataがNULLです'
    WHEN listing_data::text = '{}' THEN
      '❌ listing_dataが空のオブジェクトです'
    WHEN listing_data->>'weight_g' IS NULL THEN
      '❌ weight_gキーが存在しません'
    WHEN (listing_data->>'weight_g')::numeric <= 0 THEN
      '⚠️ weight_gが0以下です: ' || listing_data->>'weight_g'
    ELSE
      '✅ weight_g OK: ' || listing_data->>'weight_g'
  END as weight_g_diagnosis
FROM products_master
WHERE id = 322;

-- 4. 全フィールドのダンプ（デバッグ用）
SELECT 
  '=== 全フィールド ===' as section,
  id, sku, source_system, source_id,
  title, title_en,
  price_jpy, purchase_price_jpy, current_price,
  listing_data,
  scraped_data,
  created_at, updated_at
FROM products_master
WHERE id = 322;

-- 5. 他の商品との比較（正常な商品を探す）
SELECT 
  '=== 正常な商品例 ===' as section,
  id,
  title,
  price_jpy,
  pg_typeof(price_jpy) as price_jpy_type,
  listing_data->>'weight_g' as weight_g,
  pg_typeof(listing_data->>'weight_g') as weight_g_type
FROM products_master
WHERE price_jpy IS NOT NULL
  AND price_jpy > 0
  AND listing_data IS NOT NULL
  AND listing_data->>'weight_g' IS NOT NULL
  AND (listing_data->>'weight_g')::numeric > 0
LIMIT 3;

-- 6. price_jpyが文字列として格納されている商品を検出
SELECT 
  '=== 型の問題がある商品 ===' as section,
  COUNT(*) as count,
  '文字列型のprice_jpyを検出' as issue
FROM products_master
WHERE pg_typeof(price_jpy)::text != 'numeric'
  AND price_jpy IS NOT NULL;

-- 7. テーブル構造の確認
SELECT 
  '=== テーブル構造 ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
  AND column_name IN ('id', 'price_jpy', 'listing_data')
ORDER BY ordinal_position;

-- 8. 最終診断と修正SQL生成
WITH diagnosis AS (
  SELECT 
    id,
    title,
    price_jpy IS NULL OR price_jpy <= 0 as price_issue,
    listing_data IS NULL 
      OR listing_data::text = '{}' 
      OR listing_data->>'weight_g' IS NULL 
      OR (listing_data->>'weight_g')::numeric <= 0 as weight_issue
  FROM products_master
  WHERE id = 322
)
SELECT 
  '=== 修正SQL ===' as section,
  CASE 
    WHEN price_issue AND weight_issue THEN
      'UPDATE products_master SET ' ||
      'price_jpy = 1500, ' ||
      'listing_data = jsonb_set(COALESCE(listing_data, ''{}''::jsonb), ''{weight_g}'', ''500''::jsonb), ' ||
      'updated_at = NOW() ' ||
      'WHERE id = 322;'
    WHEN price_issue THEN
      'UPDATE products_master SET price_jpy = 1500, updated_at = NOW() WHERE id = 322;'
    WHEN weight_issue THEN
      'UPDATE products_master SET ' ||
      'listing_data = jsonb_set(COALESCE(listing_data, ''{}''::jsonb), ''{weight_g}'', ''500''::jsonb), ' ||
      'updated_at = NOW() WHERE id = 322;'
    ELSE
      'データは正常です。他の問題を確認してください。'
  END as suggested_fix
FROM diagnosis;
