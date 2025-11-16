-- ============================================
-- 🚀 即座実行可能 - 最終修正SQL
-- すべてのツールを動作させるための完全修正
-- ============================================

-- ========================================
-- Phase 1: ID=322の即座修正
-- ========================================

-- 1-1. 現在の状態を確認
SELECT 
  'Phase 1: ID=322確認' as phase,
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g
FROM products_master
WHERE id = 322;

-- 1-2. price_jpyを設定
UPDATE products_master
SET price_jpy = 1500, updated_at = NOW()
WHERE id = 322;

-- 1-3. listing_dataを初期化（もしNULLなら）
UPDATE products_master
SET listing_data = '{}'::jsonb, updated_at = NOW()
WHERE id = 322 AND listing_data IS NULL;

-- 1-4. weight_gを設定
UPDATE products_master
SET listing_data = jsonb_set(
  COALESCE(listing_data, '{}'::jsonb),
  '{weight_g}',
  '500'::jsonb
), updated_at = NOW()
WHERE id = 322;

-- 1-5. 結果確認
SELECT 
  'Phase 1: 修正後' as phase,
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  CASE 
    WHEN price_jpy IS NOT NULL AND (listing_data->>'weight_g')::numeric > 0 
    THEN 'OK - 全ツール動作可能'
    ELSE 'NG - まだ不足'
  END as status
FROM products_master
WHERE id = 322;

-- ========================================
-- Phase 2: 全商品の診断
-- ========================================

-- 2-1. データ不足の商品を特定
SELECT 
  'Phase 2: データ不足商品' as phase,
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
LIMIT 20;

-- 2-2. 統計情報
SELECT 
  'Phase 2: 統計' as phase,
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) - COUNT(price_jpy) as missing_price_jpy,
  COUNT(*) FILTER (WHERE listing_data->>'weight_g' IS NOT NULL) as has_weight_g,
  COUNT(*) - COUNT(*) FILTER (WHERE listing_data->>'weight_g' IS NOT NULL) as missing_weight_g,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_all_tools,
  ROUND(
    COUNT(*) FILTER (
      WHERE price_jpy IS NOT NULL 
      AND (listing_data->>'weight_g')::numeric > 0
    )::numeric / NULLIF(COUNT(*), 0)::numeric * 100,
    1
  ) as ready_percentage
FROM products_master;

-- ========================================
-- Phase 3: 代替データからの自動補完
-- ========================================

-- 3-1. price_jpyを他のフィールドから補完
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

-- 3-2. listing_dataを初期化
UPDATE products_master
SET 
  listing_data = '{}'::jsonb,
  updated_at = NOW()
WHERE listing_data IS NULL;

-- 3-3. weight_gのデフォルト値設定（500g）
-- ⚠️ 注意: デフォルト値です。実際の重量に基づいて後で修正してください
-- コメントを外して実行:
/*
UPDATE products_master
SET 
  listing_data = jsonb_set(
    listing_data,
    '{weight_g}',
    '500'::jsonb
  ),
  updated_at = NOW()
WHERE listing_data->>'weight_g' IS NULL
   OR listing_data->>'weight_g' = '';
*/

-- ========================================
-- Phase 4: 修正結果の確認
-- ========================================

-- 4-1. 修正後の統計
SELECT 
  'Phase 4: 修正後統計' as phase,
  COUNT(*) as total_products,
  COUNT(price_jpy) as has_price_jpy,
  COUNT(*) - COUNT(price_jpy) as still_missing_price_jpy,
  COUNT(*) FILTER (WHERE listing_data->>'weight_g' IS NOT NULL) as has_weight_g,
  COUNT(*) - COUNT(*) FILTER (WHERE listing_data->>'weight_g' IS NOT NULL) as still_missing_weight_g,
  COUNT(*) FILTER (
    WHERE price_jpy IS NOT NULL 
    AND (listing_data->>'weight_g')::numeric > 0
  ) as ready_for_all_tools,
  ROUND(
    COUNT(*) FILTER (
      WHERE price_jpy IS NOT NULL 
      AND (listing_data->>'weight_g')::numeric > 0
    )::numeric / NULLIF(COUNT(*), 0)::numeric * 100,
    1
  ) as ready_percentage
FROM products_master;

-- 4-2. まだ修正が必要な商品（手動修正必要）
SELECT 
  'Phase 4: 要手動修正' as phase,
  id,
  title,
  price_jpy,
  purchase_price_jpy,
  current_price,
  listing_data->>'weight_g' as weight_g,
  '⚠️ 手動でprice_jpyとweight_gを設定してください' as action
FROM products_master
WHERE price_jpy IS NULL 
   OR listing_data->>'weight_g' IS NULL
ORDER BY id
LIMIT 10;

-- 4-3. 完璧な商品の例（参考用）
SELECT 
  'Phase 4: 完璧な商品例' as phase,
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  listing_data->>'length_cm' as length_cm,
  listing_data->>'width_cm' as width_cm,
  listing_data->>'height_cm' as height_cm,
  '✅ すべてのツールが使用可能' as status
FROM products_master
WHERE price_jpy IS NOT NULL
  AND price_jpy > 0
  AND listing_data IS NOT NULL
  AND (listing_data->>'weight_g')::numeric > 0
ORDER BY updated_at DESC
LIMIT 5;

-- ========================================
-- Phase 5: 各ツールの動作確認クエリ
-- ========================================

-- 5-1. 送料計算 - 準備OK商品
SELECT 
  'Phase 5: 送料計算OK' as phase,
  COUNT(*) as count,
  '✅ price_jpy + weight_g' as requirements
FROM products_master
WHERE price_jpy IS NOT NULL
  AND (listing_data->>'weight_g')::numeric > 0;

-- 5-2. 利益計算 - 準備OK商品（送料計算後）
SELECT 
  'Phase 5: 利益計算OK' as phase,
  COUNT(*) as count,
  '✅ price_jpy + ddp_price_usd' as requirements
FROM products_master
WHERE price_jpy IS NOT NULL
  AND (listing_data->>'ddp_price_usd')::numeric > 0;

-- 5-3. SM分析 - 準備OK商品
SELECT 
  'Phase 5: SM分析OK' as phase,
  COUNT(*) as count,
  '✅ english_title or title' as requirements
FROM products_master
WHERE (title_en IS NOT NULL AND title_en != '')
   OR (title IS NOT NULL AND title != '');

-- 5-4. カテゴリ分析 - 準備OK商品
SELECT 
  'Phase 5: カテゴリ分析OK' as phase,
  COUNT(*) as count,
  '✅ english_title or title' as requirements
FROM products_master
WHERE (title_en IS NOT NULL AND title_en != '')
   OR (title IS NOT NULL AND title != '');

-- 5-5. HTML生成 - 準備OK商品
SELECT 
  'Phase 5: HTML生成OK' as phase,
  COUNT(*) as count,
  '✅ title + description + images' as requirements
FROM products_master
WHERE (title IS NOT NULL AND title != '')
  AND (description IS NOT NULL OR scraped_data->>'description' IS NOT NULL)
  AND (
    (images IS NOT NULL AND jsonb_array_length(images) > 0)
    OR (scraped_data->'images' IS NOT NULL AND jsonb_array_length(scraped_data->'images') > 0)
  );

-- 5-6. フィルター - 準備OK商品
SELECT 
  'Phase 5: フィルターOK' as phase,
  COUNT(*) as count,
  '✅ title + category' as requirements
FROM products_master
WHERE (title IS NOT NULL AND title != '')
  AND (category IS NOT NULL AND category != '');

-- 5-7. 一括リサーチ - 準備OK商品
SELECT 
  'Phase 5: 一括リサーチOK' as phase,
  COUNT(*) as count,
  '✅ english_title + price_jpy' as requirements
FROM products_master
WHERE (title_en IS NOT NULL AND title_en != '')
  AND price_jpy IS NOT NULL;

-- ========================================
-- 最終サマリー
-- ========================================

SELECT 
  '=== 最終サマリー ===' as summary,
  (SELECT COUNT(*) FROM products_master) as total_products,
  (SELECT COUNT(*) FROM products_master 
   WHERE price_jpy IS NOT NULL 
   AND (listing_data->>'weight_g')::numeric > 0) as fully_ready,
  ROUND(
    (SELECT COUNT(*)::numeric FROM products_master 
     WHERE price_jpy IS NOT NULL 
     AND (listing_data->>'weight_g')::numeric > 0) 
    / 
    NULLIF((SELECT COUNT(*)::numeric FROM products_master), 0) 
    * 100,
    1
  ) as ready_percentage,
  '✅ Phase 1完了: ID=322修正 → すぐ使える' as phase1_status,
  '⚠️ Phase 3実行推奨: 全商品の自動補完 → bulk_fix_all.sql' as phase3_recommendation,
  '📖 詳細ガイド: COMPLETE_STATUS_REPORT.md を参照' as documentation;
