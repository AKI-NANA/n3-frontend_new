-- ====================================
-- products_masterテーブルの完全診断
-- ====================================

-- 1. テーブルが存在するか確認
SELECT 
  '=== テーブル存在確認 ===' as check_type,
  EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'products_master'
  ) as table_exists;

-- 2. 全カラムのリスト（型と詳細情報）
SELECT 
  '=== 全カラム一覧 ===' as check_type,
  ordinal_position as "#",
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master'
ORDER BY ordinal_position;

-- 3. price関連カラムの検索
SELECT 
  '=== Price関連カラム ===' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master'
  AND column_name ILIKE '%price%'
ORDER BY column_name;

-- 4. weight/listing関連カラムの検索
SELECT 
  '=== Weight/Listing関連カラム ===' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_master'
  AND (column_name ILIKE '%weight%' OR column_name ILIKE '%listing%')
ORDER BY column_name;

-- 5. ID=322の実際のデータ（全カラム）
SELECT 
  '=== ID=322の生データ ===' as check_type,
  *
FROM products_master
WHERE id = 322;

-- 6. ID=322のlisting_data詳細
SELECT 
  '=== ID=322のlisting_data ===' as check_type,
  id,
  listing_data,
  jsonb_pretty(listing_data) as listing_data_pretty
FROM products_master
WHERE id = 322;

-- 7. 正常なデータを持つ商品の例
SELECT 
  '=== 正常商品の例 ===' as check_type,
  id,
  title,
  -- price関連（全て試す）
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products_master' AND column_name = 'price_jpy')
    THEN 'price_jpy カラム存在'
    ELSE 'price_jpy カラム不在'
  END as price_jpy_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products_master' AND column_name = 'purchase_price_jpy')
    THEN 'purchase_price_jpy カラム存在'
    ELSE 'purchase_price_jpy カラム不在'
  END as purchase_price_jpy_check
FROM products_master
LIMIT 1;
