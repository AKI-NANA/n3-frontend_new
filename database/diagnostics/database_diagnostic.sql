-- ============================================
-- データベース診断スクリプト
-- products_master の状態を完全チェック
-- ============================================

-- 📊 ステップ1: 基本統計
SELECT 
  '基本統計' as チェック項目,
  COUNT(*) as 全商品数,
  COUNT(price_jpy) as price_jpy有り,
  COUNT(listing_data) as listing_data有り,
  COUNT(listing_data) FILTER (
    WHERE listing_data::text != '{}'::text
  ) as listing_data空でない
FROM products_master;

-- 🔍 ステップ2: 商品ID=322の詳細チェック
SELECT 
  '商品ID=322詳細' as チェック項目,
  id,
  title,
  price_jpy,
  price_jpy IS NOT NULL as price_jpy存在,
  listing_data,
  listing_data IS NOT NULL as listing_data存在,
  listing_data::text != '{}'::text as listing_data空でない,
  listing_data->>'weight_g' as weight_g文字列,
  (listing_data->>'weight_g')::numeric as weight_g数値,
  listing_data->>'length_cm' as length_cm,
  listing_data->>'width_cm' as width_cm,
  listing_data->>'height_cm' as height_cm
FROM products_master
WHERE id = 322;

-- ⚠️ ステップ3: データ不足の商品を特定
SELECT 
  'データ不足商品' as チェック項目,
  id,
  title,
  CASE WHEN price_jpy IS NULL THEN '❌' ELSE '✅' END as price_jpy,
  CASE WHEN listing_data IS NULL THEN '❌' 
       WHEN listing_data::text = '{}'::text THEN '⚠️空'
       ELSE '✅' END as listing_data,
  CASE WHEN listing_data->>'weight_g' IS NULL THEN '❌' ELSE '✅' END as weight_g,
  price_jpy as 価格,
  listing_data->>'weight_g' as 重量
FROM products_master
WHERE price_jpy IS NULL 
   OR listing_data IS NULL
   OR listing_data::text = '{}'::text
   OR listing_data->>'weight_g' IS NULL
ORDER BY id
LIMIT 20;

-- 📈 ステップ4: フィールド別の充填率
SELECT 
  'フィールド充填率' as チェック項目,
  COUNT(*) as 全商品,
  ROUND(COUNT(price_jpy)::numeric / COUNT(*)::numeric * 100, 1) as price_jpy充填率,
  ROUND(COUNT(listing_data) FILTER (WHERE listing_data::text != '{}')::numeric / COUNT(*)::numeric * 100, 1) as listing_data充填率,
  ROUND(COUNT(listing_data->>'weight_g') FILTER (WHERE listing_data->>'weight_g' IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 1) as weight_g充填率,
  ROUND(COUNT(listing_data->>'length_cm') FILTER (WHERE listing_data->>'length_cm' IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 1) as length_cm充填率
FROM products_master;

-- 🔧 ステップ5: 修正可能なデータを探す
-- price_jpyが空だが、他のフィールドから取得できる商品
SELECT 
  '修正可能(price_jpy)' as チェック項目,
  id,
  title,
  price_jpy as 現在のprice_jpy,
  purchase_price_jpy as 代替1_purchase_price_jpy,
  current_price as 代替2_current_price,
  (scraped_data->>'current_price')::numeric as 代替3_scraped_current_price,
  COALESCE(
    price_jpy,
    purchase_price_jpy,
    current_price,
    (scraped_data->>'current_price')::numeric
  ) as 採用すべき価格
FROM products_master
WHERE price_jpy IS NULL
  AND (
    purchase_price_jpy IS NOT NULL
    OR current_price IS NOT NULL
    OR scraped_data->>'current_price' IS NOT NULL
  )
LIMIT 10;

-- 🔧 ステップ6: listing_dataが空の商品（修正必要）
SELECT 
  'listing_data空' as チェック項目,
  id,
  title,
  listing_data,
  scraped_data->>'weight' as scraped_weight,
  scraped_data->>'length' as scraped_length,
  ebay_api_data->'itemSummaries'->0->'shippingOptions'->0->'weight'->>'value' as ebay_weight
FROM products_master
WHERE listing_data IS NULL 
   OR listing_data::text = '{}'::text
LIMIT 10;

-- ✅ ステップ7: 完璧な商品（参考用）
SELECT 
  '完璧な商品' as チェック項目,
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data->>'length_cm' as length_cm,
  listing_data->>'ddp_price_usd' as ddp_price_usd
FROM products_master
WHERE price_jpy IS NOT NULL
  AND listing_data IS NOT NULL
  AND listing_data::text != '{}'::text
  AND (listing_data->>'weight_g')::numeric > 0
ORDER BY updated_at DESC
LIMIT 5;

-- 🎯 ステップ8: 送料計算可能な商品の割合
SELECT 
  '送料計算可能性' as チェック項目,
  COUNT(*) as 全商品,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL
      AND listing_data IS NOT NULL
      AND (listing_data->>'weight_g')::numeric > 0
  ) as 計算可能な商品,
  ROUND(
    COUNT(*) FILTER (
      WHERE price_jpy IS NOT NULL
        AND listing_data IS NOT NULL
        AND (listing_data->>'weight_g')::numeric > 0
    )::numeric / COUNT(*)::numeric * 100,
    1
  ) as 計算可能率
FROM products_master;
