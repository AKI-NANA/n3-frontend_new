-- ============================================
-- 全商品の一括診断・修正SQL
-- ============================================

-- ========================================
-- PART 1: 診断（READ ONLY - 安全）
-- ========================================

-- 1-1. データ不足の商品を特定
SELECT 
  'データ不足商品リスト' as report_type,
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  CASE WHEN price_jpy IS NULL THEN 'NG' ELSE 'OK' END as price_status,
  CASE WHEN listing_data->>'weight_g' IS NULL THEN 'NG' ELSE 'OK' END as weight_status
FROM products_master
WHERE price_jpy IS NULL 
   OR listing_data->>'weight_g' IS NULL
ORDER BY id
LIMIT 50;

-- 1-2. 統計情報
SELECT 
  'データ統計' as report_type,
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) - COUNT(price_jpy) as missing_price_jpy,
  COUNT(listing_data->>'weight_g') as has_weight_g,
  COUNT(*) - COUNT(listing_data->>'weight_g') as missing_weight_g,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_shipping_calc
FROM products_master;

-- 1-3. 修正可能な商品（代替データあり）
SELECT 
  '修正可能商品' as report_type,
  id,
  title,
  price_jpy as current_price_jpy,
  purchase_price_jpy,
  current_price,
  (scraped_data->>'current_price')::numeric as scraped_price,
  COALESCE(
    price_jpy,
    purchase_price_jpy,
    current_price,
    (scraped_data->>'current_price')::numeric
  ) as suggested_price_jpy
FROM products_master
WHERE price_jpy IS NULL
  AND (
    purchase_price_jpy IS NOT NULL
    OR current_price IS NOT NULL
    OR scraped_data->>'current_price' IS NOT NULL
  )
LIMIT 20;

-- ========================================
-- PART 2: 修正（WRITE - 注意！）
-- 実行前に必ずバックアップを取ってください
-- ========================================

-- 2-1. price_jpyの補完（代替データから）
-- コメントを外して実行してください
/*
UPDATE products_master
SET 
  price_jpy = COALESCE(
    price_jpy,
    purchase_price_jpy,
    current_price,
    (scraped_data->>'current_price')::numeric
  ),
  updated_at = NOW()
WHERE price_jpy IS NULL
  AND (
    purchase_price_jpy IS NOT NULL
    OR current_price IS NOT NULL
    OR scraped_data->>'current_price' IS NOT NULL
  );
*/

-- 2-2. listing_dataの初期化
-- コメントを外して実行してください
/*
UPDATE products_master
SET 
  listing_data = '{}'::jsonb,
  updated_at = NOW()
WHERE listing_data IS NULL;
*/

-- 2-3. weight_gのデフォルト値設定（500g）
-- 警告: 実際の商品重量に基づいて個別に設定することを強く推奨
-- コメントを外して実行してください
/*
UPDATE products_master
SET 
  listing_data = jsonb_set(
    COALESCE(listing_data, '{}'::jsonb),
    '{weight_g}',
    '500'::jsonb
  ),
  updated_at = NOW()
WHERE listing_data->>'weight_g' IS NULL
   OR listing_data->>'weight_g' = '';
*/

-- ========================================
-- PART 3: 修正後の確認
-- ========================================

-- 3-1. 修正結果の統計
SELECT 
  '修正後統計' as report_type,
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) - COUNT(price_jpy) as still_missing_price_jpy,
  COUNT(listing_data->>'weight_g') as has_weight_g,
  COUNT(*) - COUNT(listing_data->>'weight_g') as still_missing_weight_g,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_shipping_calc,
  ROUND(
    COUNT(*) FILTER (
      WHERE price_jpy IS NOT NULL 
      AND (listing_data->>'weight_g')::numeric > 0
    )::numeric / COUNT(*)::numeric * 100,
    1
  ) as ready_percentage
FROM products_master;

-- 3-2. まだ修正が必要な商品
SELECT 
  '要手動修正' as report_type,
  id,
  title,
  price_jpy,
  purchase_price_jpy,
  current_price,
  listing_data->>'weight_g' as weight_g
FROM products_master
WHERE price_jpy IS NULL 
   OR listing_data->>'weight_g' IS NULL
ORDER BY id
LIMIT 20;
