-- ============================================
-- 商品ID=322のデータ構造確認
-- ============================================

-- 1. 基本情報を確認
SELECT 
  id,
  title,
  price_jpy,
  source_system,
  source_id,
  created_at,
  updated_at
FROM products_master
WHERE id = 322;

-- 2. listing_dataの内容を確認
SELECT 
  id,
  title,
  listing_data
FROM products_master
WHERE id = 322;

-- 3. listing_data内のweight_gを確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data->>'length_cm' as length_cm,
  listing_data->>'width_cm' as width_cm,
  listing_data->>'height_cm' as height_cm
FROM products_master
WHERE id = 322;

-- 4. scraped_dataも確認（元データに重量情報があるかも）
SELECT 
  id,
  title,
  scraped_data
FROM products_master
WHERE id = 322;

-- 5. 全フィールドを確認
SELECT *
FROM products_master
WHERE id = 322;

-- 6. 他の商品で正常に動作するデータの例を確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data->>'height_cm' as height_cm
FROM products_master
WHERE price_jpy IS NOT NULL
  AND listing_data->>'weight_g' IS NOT NULL
  AND listing_data->>'weight_g' != ''
LIMIT 5;
