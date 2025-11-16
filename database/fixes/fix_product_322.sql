-- ============================================
-- 商品ID=322のデータ修正スクリプト
-- ============================================
-- 目的: 送料・利益計算に必要なデータを設定

-- 📋 ステップ1: 現在のデータを確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as current_weight_g,
  listing_data
FROM products_master
WHERE id = 322;

-- 🔧 ステップ2: 不足データを補完
-- 注意: 実際の商品情報に基づいて値を調整してください

-- Option A: price_jpyが不足している場合
UPDATE products_master
SET 
  price_jpy = COALESCE(
    price_jpy,  -- 既存値を優先
    purchase_price_jpy,  -- なければpurchase_price_jpyから
    current_price,  -- なければcurrent_priceから
    (scraped_data->>'current_price')::numeric,  -- なければscraped_dataから
    1000  -- デフォルト値（仮）
  ),
  updated_at = NOW()
WHERE id = 322
  AND price_jpy IS NULL;

-- Option B: listing_data.weight_gが不足している場合
-- まずlisting_dataの存在を確認
UPDATE products_master
SET 
  listing_data = COALESCE(listing_data, '{}'::jsonb),
  updated_at = NOW()
WHERE id = 322
  AND listing_data IS NULL;

-- 重量データを追加（scraped_dataから取得 or デフォルト値）
UPDATE products_master
SET 
  listing_data = jsonb_set(
    COALESCE(listing_data, '{}'::jsonb),
    '{weight_g}',
    COALESCE(
      -- scraped_dataから取得を試みる
      (scraped_data->>'weight_g')::jsonb,
      -- ebay_api_dataから取得を試みる
      (ebay_api_data->'itemSummaries'->0->'shippingOptions'->0->'weight'->>'value')::jsonb,
      -- デフォルト値: 500g（実際の重量に置き換えてください）
      '500'::jsonb
    )
  ),
  updated_at = NOW()
WHERE id = 322
  AND (listing_data->>'weight_g' IS NULL OR listing_data->>'weight_g' = '');

-- 🔍 ステップ3: 修正結果を確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data->>'length_cm' as length_cm,
  listing_data->>'width_cm' as width_cm,
  listing_data->>'height_cm' as height_cm,
  CASE 
    WHEN price_jpy IS NOT NULL AND (listing_data->>'weight_g')::numeric > 0 
    THEN '✅ 計算可能'
    ELSE '❌ データ不足'
  END as status
FROM products_master
WHERE id = 322;

-- 📊 ステップ4: 他の商品でも同様の問題がないか確認
SELECT 
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price,
  COUNT(listing_data->>'weight_g') as has_weight,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_calculation,
  COUNT(*) FILTER (
    WHERE price_jpy IS NULL 
    OR listing_data->>'weight_g' IS NULL
    OR (listing_data->>'weight_g')::numeric = 0
  ) as needs_fixing
FROM products_master;

-- 🔧 ステップ5: 一括修正（全商品）
-- 注意: 実行前に必ずバックアップを取ってください

-- price_jpyの一括補完
-- UPDATE products_master
-- SET 
--   price_jpy = COALESCE(
--     price_jpy,
--     purchase_price_jpy,
--     current_price,
--     (scraped_data->>'current_price')::numeric
--   ),
--   updated_at = NOW()
-- WHERE price_jpy IS NULL;

-- listing_dataの初期化（NULLの場合）
-- UPDATE products_master
-- SET 
--   listing_data = '{}'::jsonb,
--   updated_at = NOW()
-- WHERE listing_data IS NULL;

-- 重量データの一括設定（仮値: 500g）
-- ⚠️ 実際の商品重量に基づいて個別に設定することを推奨
-- UPDATE products_master
-- SET 
--   listing_data = jsonb_set(
--     listing_data,
--     '{weight_g}',
--     '500'::jsonb
--   ),
--   updated_at = NOW()
-- WHERE listing_data->>'weight_g' IS NULL;
