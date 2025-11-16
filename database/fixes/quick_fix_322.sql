-- ============================================
-- 即座に実行可能な修正SQL
-- 商品ID=322のデータ修正
-- ============================================

-- ステップ1: 現在の状態を確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g
FROM products_master
WHERE id = 322;

-- ステップ2: price_jpyを設定（1500円）
UPDATE products_master
SET price_jpy = 1500, updated_at = NOW()
WHERE id = 322 AND price_jpy IS NULL;

-- ステップ3: listing_dataを初期化（もしNULLなら）
UPDATE products_master
SET listing_data = '{}'::jsonb, updated_at = NOW()
WHERE id = 322 AND listing_data IS NULL;

-- ステップ4: weight_gを設定（500g）
UPDATE products_master
SET listing_data = jsonb_set(
  COALESCE(listing_data, '{}'::jsonb),
  '{weight_g}',
  '500'::jsonb
), updated_at = NOW()
WHERE id = 322;

-- ステップ5: 結果を確認
SELECT 
  id,
  title,
  price_jpy,
  listing_data->>'weight_g' as weight_g,
  CASE 
    WHEN price_jpy IS NOT NULL AND (listing_data->>'weight_g')::numeric > 0 
    THEN 'OK - 計算可能'
    ELSE 'NG - データ不足'
  END as status
FROM products_master
WHERE id = 322;
